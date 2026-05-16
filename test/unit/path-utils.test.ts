import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getRoutePath, getApiUrlPath } from '../../src/path-utils.js';
import { createTempDir, cleanupTempDir } from '../helpers.js';
import path from 'node:path';
import fs from 'node:fs';

describe('path-utils', () => {
	let tempDir: string;
	let originalCwd: string;

	beforeEach(() => {
		tempDir = fs.realpathSync.native(createTempDir());
		originalCwd = process.cwd();
		const apiDir = path.join(tempDir, 'src', 'routes', 'api');
		fs.mkdirSync(apiDir, { recursive: true });
		process.chdir(tempDir);
	});

	afterEach(() => {
		process.chdir(originalCwd);
		cleanupTempDir(tempDir);
	});

	describe('getRoutePath', () => {
		it('should convert file path to route identifier', () => {
			const filePath = path.join(tempDir, 'src', 'routes', 'api', 'v1', 'users', '-api.server.ts');
			const result = getRoutePath(filePath);
			expect(result).toBe('v1_users');
		});

		it('should handle single-level path', () => {
			const filePath = path.join(tempDir, 'src', 'routes', 'api', 'hello', '-api.server.ts');
			const result = getRoutePath(filePath);
			expect(result).toBe('hello');
		});

		it('should handle deeply nested path', () => {
			const filePath = path.join(tempDir, 'src', 'routes', 'api', 'v1', 'admin', 'users', 'list', '-api.server.ts');
			const result = getRoutePath(filePath);
			expect(result).toBe('v1_admin_users_list');
		});

		it('should handle root-level api file', () => {
			const filePath = path.join(tempDir, 'src', 'routes', 'api', '-api.server.ts');
			const result = getRoutePath(filePath);
			expect(result).toBe('');
		});
	});

	describe('getApiUrlPath', () => {
		it('should convert route path to API URL', () => {
			expect(getApiUrlPath('v1_users')).toBe('/api/v1/users');
		});

		it('should handle single segment', () => {
			expect(getApiUrlPath('hello')).toBe('/api/hello');
		});

		it('should handle deeply nested path', () => {
			expect(getApiUrlPath('v1_admin_users_list')).toBe('/api/v1/admin/users/list');
		});

		it('should handle empty route path', () => {
			expect(getApiUrlPath('')).toBe('/api/');
		});
	});
});
