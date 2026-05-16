import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { writeIfChanged, removeGeneratedFile } from '../src/file-writer.js';
import { GENERATED_MARKER } from '../src/config.js';
import { createTempDir, cleanupTempDir } from './helpers.js';

describe('file-writer', () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = createTempDir();
	});

	afterEach(() => {
		cleanupTempDir(tempDir);
	});

	describe('writeIfChanged', () => {
		it('should write new file when it does not exist', async () => {
			const filePath = path.join(tempDir, 'test.txt');
			const result = await writeIfChanged(filePath, 'hello world');
			expect(result).toBe(true);
			expect(fs.readFileSync(filePath, 'utf-8')).toBe('hello world');
		});

		it('should not write when content is identical', async () => {
			const filePath = path.join(tempDir, 'test.txt');
			fs.writeFileSync(filePath, 'hello world', 'utf-8');
			const result = await writeIfChanged(filePath, 'hello world');
			expect(result).toBe(false);
		});

		it('should write when content changed', async () => {
			const filePath = path.join(tempDir, 'test.txt');
			fs.writeFileSync(filePath, 'old content', 'utf-8');
			const result = await writeIfChanged(filePath, 'new content');
			expect(result).toBe(true);
			expect(fs.readFileSync(filePath, 'utf-8')).toBe('new content');
		});

		it('should create parent directories if needed', async () => {
			const nestedPath = path.join(tempDir, 'a', 'b', 'c', 'test.txt');
			const result = await writeIfChanged(nestedPath, 'nested');
			expect(result).toBe(true);
			expect(fs.readFileSync(nestedPath, 'utf-8')).toBe('nested');
		});
	});

	describe('removeGeneratedFile', () => {
		it('should remove file with generated marker', async () => {
			const filePath = path.join(tempDir, 'generated.ts');
			fs.writeFileSync(filePath, GENERATED_MARKER + 'content', 'utf-8');
			await removeGeneratedFile(filePath);
			expect(fs.existsSync(filePath)).toBe(false);
		});

		it('should not remove file without generated marker', async () => {
			const filePath = path.join(tempDir, 'user-file.ts');
			fs.writeFileSync(filePath, '// user code\n', 'utf-8');
			await removeGeneratedFile(filePath);
			expect(fs.existsSync(filePath)).toBe(true);
		});

		it('should silently return when file does not exist', async () => {
			const filePath = path.join(tempDir, 'nonexistent.ts');
			await expect(removeGeneratedFile(filePath)).resolves.toBeUndefined();
		});
	});
});
