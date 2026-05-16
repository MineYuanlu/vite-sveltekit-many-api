import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { generateOpenApiRegistry } from '../../../src/generators/registry/openapi.js';
import { createTempDir, cleanupTempDir } from '../../helpers.js';
import type { EndpointInfo } from '../../../src/types.js';

describe('generateOpenApiRegistry', () => {
	let tempDir: string;
	let originalCwd: string;

	beforeEach(() => {
		tempDir = createTempDir();
		originalCwd = process.cwd();
		// Setup src/routes/api
		const apiDir = path.join(tempDir, 'src', 'routes', 'api');
		fs.mkdirSync(apiDir, { recursive: true });
		process.chdir(tempDir);
	});

	afterEach(() => {
		process.chdir(originalCwd);
		cleanupTempDir(tempDir);
	});

	function createEndpoint(overrides: Partial<EndpointInfo> = {}): EndpointInfo {
		return {
			filePath: path.join(tempDir, 'src', 'routes', 'api', '-api.server.ts'),
			routePath: '',
			apiUrl: '/api/',
			methods: [{ method: 'GET', hasSchema: false }],
			...overrides,
		};
	}

	it('should generate registry file for single endpoint', async () => {
		const ep = createEndpoint();
		const written = await generateOpenApiRegistry([ep]);
		expect(written).toBe(true);

		const registryPath = path.join(tempDir, 'src', 'routes', 'api', 'openapi-registry.server.ts');
		expect(fs.existsSync(registryPath)).toBe(true);

		const content = fs.readFileSync(registryPath, 'utf-8');
		expect(content).toContain('export const endpoints: ApiEndpoint[] = [');
		expect(content).toContain('path: \'/api/\'');
		expect(content).toContain('method: \'GET\'');
		expect(content).toContain('operationId: \'_get\'');
		expect(content).toContain('usesBody: false');
	});

	it('should generate registry with schema imports', async () => {
		const ep = createEndpoint({
			filePath: path.join(tempDir, 'src', 'routes', 'api', 'hello', '-api.server.ts'),
			routePath: 'hello',
			apiUrl: '/api/hello',
			methods: [{ method: 'POST', hasSchema: true, description: 'Create hello' }],
		});
		const written = await generateOpenApiRegistry([ep]);
		expect(written).toBe(true);

		const registryPath = path.join(tempDir, 'src', 'routes', 'api', 'openapi-registry.server.ts');
		const content = fs.readFileSync(registryPath, 'utf-8');
		expect(content).toContain('zPOST as s0_zPOST');
		expect(content).toContain('dPOST as s0_dPOST');
		expect(content).toContain('operationId: \'hello_post\'');
		expect(content).toContain('usesBody: true');
	});

	it('should use custom name in operationId', async () => {
		const ep = createEndpoint({
			filePath: path.join(tempDir, 'src', 'routes', 'api', 'hello', '-api.server.ts'),
			routePath: 'hello',
			apiUrl: '/api/hello',
			methods: [{ method: 'GET', hasSchema: false, customName: 'fetchHello' }],
		});
		await generateOpenApiRegistry([ep]);

		const registryPath = path.join(tempDir, 'src', 'routes', 'api', 'openapi-registry.server.ts');
		const content = fs.readFileSync(registryPath, 'utf-8');
		expect(content).toContain('operationId: \'fetchHello\'');
	});

	it('should sort endpoints by routePath', async () => {
		const eps = [
			createEndpoint({
				filePath: path.join(tempDir, 'src', 'routes', 'api', 'zoo', '-api.server.ts'),
				routePath: 'zoo',
				apiUrl: '/api/zoo',
				methods: [{ method: 'GET', hasSchema: false }],
			}),
			createEndpoint({
				filePath: path.join(tempDir, 'src', 'routes', 'api', 'apple', '-api.server.ts'),
				routePath: 'apple',
				apiUrl: '/api/apple',
				methods: [{ method: 'GET', hasSchema: false }],
			}),
		];
		await generateOpenApiRegistry(eps);

		const registryPath = path.join(tempDir, 'src', 'routes', 'api', 'openapi-registry.server.ts');
		const content = fs.readFileSync(registryPath, 'utf-8');
		// apple should come before zoo
		const appleIndex = content.indexOf('path: \'/api/apple\'');
		const zooIndex = content.indexOf('path: \'/api/zoo\'');
		expect(appleIndex).toBeGreaterThan(-1);
		expect(zooIndex).toBeGreaterThan(-1);
		expect(appleIndex).toBeLessThan(zooIndex);
	});

	it('should handle multiple methods in single endpoint', async () => {
		const ep = createEndpoint({
			filePath: path.join(tempDir, 'src', 'routes', 'api', 'hello', '-api.server.ts'),
			routePath: 'hello',
			apiUrl: '/api/hello',
			methods: [
				{ method: 'GET', hasSchema: false },
				{ method: 'POST', hasSchema: true },
				{ method: 'DELETE', hasSchema: false },
			],
		});
		await generateOpenApiRegistry([ep]);

		const registryPath = path.join(tempDir, 'src', 'routes', 'api', 'openapi-registry.server.ts');
		const content = fs.readFileSync(registryPath, 'utf-8');
		expect(content).toContain('method: \'GET\'');
		expect(content).toContain('method: \'POST\'');
		expect(content).toContain('method: \'DELETE\'');
	});

	it('should include generated marker', async () => {
		const ep = createEndpoint();
		await generateOpenApiRegistry([ep]);

		const registryPath = path.join(tempDir, 'src', 'routes', 'api', 'openapi-registry.server.ts');
		const content = fs.readFileSync(registryPath, 'utf-8');
		expect(content.startsWith('// @generated by @yuanlu_yl/vite-sveltekit-many-api')).toBe(true);
	});

	it('should return false when content unchanged', async () => {
		const ep = createEndpoint();
		await generateOpenApiRegistry([ep]);
		// Run again with same content
		const written = await generateOpenApiRegistry([ep]);
		expect(written).toBe(false);
	});
});
