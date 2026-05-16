import { describe, it, expect } from 'vitest';
import { apiRoutes } from '../src/index.js';

describe('apiRoutes plugin', () => {
	it('should return a valid Vite plugin object', () => {
		const plugin = apiRoutes();
		expect(plugin).toBeDefined();
		expect(plugin.name).toBe('@yuanlu_yl/vite-sveltekit-many-api');
		expect(typeof plugin.buildStart).toBe('function');
		expect(typeof plugin.configResolved).toBe('function');
		expect(typeof plugin.configureServer).toBe('function');
	});

	it('should merge util config correctly', () => {
		const plugin = apiRoutes({
			util: {
				imp: '$api/common.server',
				schema: 'zod',
			},
		});
		expect(plugin).toBeDefined();
		expect(plugin.name).toBe('@yuanlu_yl/vite-sveltekit-many-api');
	});

	it('should handle empty config', () => {
		const plugin = apiRoutes();
		expect(plugin).toBeDefined();
		expect(plugin.name).toBe('@yuanlu_yl/vite-sveltekit-many-api');
	});
});
