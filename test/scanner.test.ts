import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { scanAllApiFiles, processApiFile, scanAll } from '../src/scanner.js';
import { createTempDir, cleanupTempDir, writeApiFile } from './helpers.js';

// Mock the config to use temp directory
describe('scanner', () => {
	let tempDir: string;
	let originalCwd: string;

	beforeEach(() => {
		tempDir = createTempDir();
		originalCwd = process.cwd();
		// Create src/routes/api under tempDir and change cwd
		const apiDir = path.join(tempDir, 'src', 'routes', 'api');
		fs.mkdirSync(apiDir, { recursive: true });
		process.chdir(tempDir);
	});

	afterEach(() => {
		process.chdir(originalCwd);
		cleanupTempDir(tempDir);
	});

	describe('scanAllApiFiles', () => {
		it('should find -api.server.ts in root api dir', () => {
			const apiDir = path.join(tempDir, 'src', 'routes', 'api');
			writeApiFile(apiDir, "export const GET = async () => 'hello';");
			const files = scanAllApiFiles();
			expect(files).toHaveLength(1);
			expect(files[0]).toContain('-api.server.ts');
		});

		it('should find -api.server.ts in nested directories', () => {
			const apiDir = path.join(tempDir, 'src', 'routes', 'api');
			const v1Dir = path.join(apiDir, 'v1');
			const usersDir = path.join(v1Dir, 'users');
			fs.mkdirSync(usersDir, { recursive: true });

			writeApiFile(apiDir, "export const GET = async () => 'root';");
			writeApiFile(v1Dir, "export const POST = async () => 'v1';");
			writeApiFile(usersDir, "export const GET = async () => 'users';");

			const files = scanAllApiFiles();
			expect(files).toHaveLength(3);
			expect(files.some((f) => f.includes('v1/users'))).toBe(true);
		});

		it('should ignore non-api files', () => {
			const apiDir = path.join(tempDir, 'src', 'routes', 'api');
			fs.writeFileSync(path.join(apiDir, 'helper.ts'), 'export const util = () => {};', 'utf-8');
			writeApiFile(apiDir, "export const GET = async () => 'hello';");

			const files = scanAllApiFiles();
			expect(files).toHaveLength(1);
			expect(files[0]).toContain('-api.server.ts');
		});

		it('should return empty array when no api files exist', () => {
			const files = scanAllApiFiles();
			expect(files).toHaveLength(0);
		});

		it('should return empty array when api dir does not exist', () => {
			// Remove the api dir
			const apiDir = path.join(tempDir, 'src', 'routes', 'api');
			fs.rmSync(apiDir, { recursive: true });
			const files = scanAllApiFiles();
			expect(files).toHaveLength(0);
		});
	});

	describe('processApiFile', () => {
		it('should process valid api file and return endpoint info', async () => {
			const apiDir = path.join(tempDir, 'src', 'routes', 'api', 'hello');
			fs.mkdirSync(apiDir, { recursive: true });
			const file = writeApiFile(apiDir, "export const GET = async () => 'hello';");

			const ep = await processApiFile(file);
			expect(ep).toBeDefined();
			expect(ep!.filePath).toBe(file);
			expect(ep!.routePath).toBe('hello');
			expect(ep!.apiUrl).toBe('/api/hello');
			expect(ep!.methods).toHaveLength(1);
			expect(ep!.methods[0].method).toBe('GET');
		});

		it('should return undefined for non-api files', async () => {
			const apiDir = path.join(tempDir, 'src', 'routes', 'api');
			const otherFile = path.join(apiDir, 'helper.ts');
			fs.writeFileSync(otherFile, 'export const util = () => {};', 'utf-8');

			const ep = await processApiFile(otherFile);
			expect(ep).toBeUndefined();
		});

		it('should return undefined when no methods exported', async () => {
			const apiDir = path.join(tempDir, 'src', 'routes', 'api');
			const file = writeApiFile(apiDir, "export const helper = () => 'hello';");

			const ep = await processApiFile(file);
			expect(ep).toBeUndefined();
		});

		it('should generate companion files', async () => {
			const apiDir = path.join(tempDir, 'src', 'routes', 'api', 'test');
			fs.mkdirSync(apiDir, { recursive: true });
			writeApiFile(apiDir, "export const GET = async () => 'hello';");

			const file = path.join(apiDir, '-api.server.ts');
			await processApiFile(file);

			// 检查生成的文件
			expect(fs.existsSync(path.join(apiDir, '+server.ts'))).toBe(true);
			expect(fs.existsSync(path.join(apiDir, 'api.remote.ts'))).toBe(true);
		});
	});

	describe('scanAll', () => {
		it('should scan and process all api files', async () => {
			const apiDir = path.join(tempDir, 'src', 'routes', 'api');
			const v1Dir = path.join(apiDir, 'v1');
			fs.mkdirSync(v1Dir, { recursive: true });

			writeApiFile(apiDir, "export const GET = async () => 'root';");
			writeApiFile(v1Dir, "export const POST = async () => 'v1';");

			const endpoints = await scanAll();
			expect(endpoints).toHaveLength(2);
			expect(endpoints.map((e) => e.routePath)).toContain('');
			expect(endpoints.map((e) => e.routePath)).toContain('v1');
		});

		it('should handle errors in individual files gracefully', async () => {
			const apiDir = path.join(tempDir, 'src', 'routes', 'api');
			const v1Dir = path.join(apiDir, 'v1');
			fs.mkdirSync(v1Dir, { recursive: true });

			// 有效文件
			writeApiFile(apiDir, "export const GET = async () => 'root';");
			// 损坏文件 (无法解析)
			fs.writeFileSync(path.join(v1Dir, '-api.server.ts'), 'export const { broken', 'utf-8');

			const endpoints = await scanAll();
			expect(endpoints).toHaveLength(1);
			expect(endpoints[0].routePath).toBe('');
		});
	});
});
