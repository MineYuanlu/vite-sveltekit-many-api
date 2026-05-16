import { describe, it, expect } from 'vitest';
import { HTTP_METHODS, usesBody } from '../../src/config.js';

describe('config', () => {
	describe('HTTP_METHODS', () => {
		it('should contain all supported HTTP methods', () => {
			expect(HTTP_METHODS).toEqual(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
		});
	});

	describe('usesBody', () => {
		it('should return true for POST, PUT, PATCH', () => {
			expect(usesBody('POST')).toBe(true);
			expect(usesBody('PUT')).toBe(true);
			expect(usesBody('PATCH')).toBe(true);
		});

		it('should return false for GET and DELETE', () => {
			expect(usesBody('GET')).toBe(false);
			expect(usesBody('DELETE')).toBe(false);
		});
	});
});
