import { describe, it, expect } from 'vitest';
import { apiRoutes } from '../src/index.js';

describe('apiRoutes', () => {
	it('should return a valid Vite plugin object', () => {
		const plugin = apiRoutes();
		expect(plugin).toBeDefined();
		expect(plugin.name).toBe('@yuanlu_yl/vite-sveltekit-many-api');
		expect(typeof plugin.buildStart).toBe('function');
		expect(typeof plugin.configResolved).toBe('function');
		expect(typeof plugin.configureServer).toBe('function');
	});
});
