import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { generateMcpRegistry } from '../../../src/generators/registry/mcp.js';
import { createTempDir, cleanupTempDir } from '../../helpers.js';
import type { EndpointInfo } from '../../../src/types.js';

describe('generateMcpRegistry', () => {
	let tempDir: string;
	let originalCwd: string;

	beforeEach(() => {
		tempDir = createTempDir();
		originalCwd = process.cwd();
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
			apiUrl: '/api',
			methods: [{ method: 'GET', hasSchema: false, hasDefinition: false }],
			...overrides,
		};
	}

	it('should generate MCP registry file for single endpoint', async () => {
		const ep = createEndpoint();
		const written = await generateMcpRegistry([ep]);
		expect(written).toBe(true);

		const registryPath = path.join(tempDir, 'src', 'routes', 'api', 'mcp-registry.server.ts');
		expect(fs.existsSync(registryPath)).toBe(true);

		const content = fs.readFileSync(registryPath, 'utf-8');
		expect(content).toContain('export const mcpTools: McpTool[] = [');
		expect(content).toContain("name: '_get'");
		expect(content).toContain("apiEndpoint: { path: '/api', method: 'GET' }");
		expect(content).toContain('handler: s0_GET');
	});

	it('should import handler and schema', async () => {
		const ep = createEndpoint({
			filePath: path.join(tempDir, 'src', 'routes', 'api', 'hello', '-api.server.ts'),
			routePath: 'hello',
			apiUrl: '/api/hello',
			methods: [{ method: 'POST', hasSchema: true, hasDefinition: false }],
		});
		await generateMcpRegistry([ep]);

		const registryPath = path.join(tempDir, 'src', 'routes', 'api', 'mcp-registry.server.ts');
		const content = fs.readFileSync(registryPath, 'utf-8');
		expect(content).toContain('POST as s0_POST');
		expect(content).toContain('zPOST as s0_zPOST');
		expect(content).toContain("name: 'hello_post'");
		expect(content).toContain('inputSchema: s0_zPOST');
	});

	it('should import dMETHOD when description or mcp present', async () => {
		const ep = createEndpoint({
			filePath: path.join(tempDir, 'src', 'routes', 'api', 'hello', '-api.server.ts'),
			routePath: 'hello',
			apiUrl: '/api/hello',
			methods: [{ method: 'GET', hasSchema: false, hasDefinition: true }],
		});
		await generateMcpRegistry([ep]);

		const registryPath = path.join(tempDir, 'src', 'routes', 'api', 'mcp-registry.server.ts');
		const content = fs.readFileSync(registryPath, 'utf-8');
		expect(content).toContain('GET as s0_GET');
		expect(content).toContain('dGET as s0_dGET');
		expect(content).toContain('definition: s0_dGET');
	});

	it('should use undefined definition when no dMETHOD', async () => {
		const ep = createEndpoint({
			filePath: path.join(tempDir, 'src', 'routes', 'api', 'hello', '-api.server.ts'),
			routePath: 'hello',
			apiUrl: '/api/hello',
			methods: [{ method: 'GET', hasSchema: false, hasDefinition: false }],
		});
		await generateMcpRegistry([ep]);

		const registryPath = path.join(tempDir, 'src', 'routes', 'api', 'mcp-registry.server.ts');
		const content = fs.readFileSync(registryPath, 'utf-8');
		expect(content).toContain('definition: undefined');
	});

	it('should use custom name', async () => {
		const ep = createEndpoint({
			filePath: path.join(tempDir, 'src', 'routes', 'api', 'hello', '-api.server.ts'),
			routePath: 'hello',
			apiUrl: '/api/hello',
			methods: [{ method: 'GET', hasSchema: false, customName: 'fetchHello', hasDefinition: false }],
		});
		await generateMcpRegistry([ep]);

		const registryPath = path.join(tempDir, 'src', 'routes', 'api', 'mcp-registry.server.ts');
		const content = fs.readFileSync(registryPath, 'utf-8');
		expect(content).toContain("name: 'fetchHello'");
	});

	it('should sort endpoints by routePath', async () => {
		const eps = [
			createEndpoint({
				filePath: path.join(tempDir, 'src', 'routes', 'api', 'zoo', '-api.server.ts'),
				routePath: 'zoo',
				apiUrl: '/api/zoo',
				methods: [{ method: 'GET', hasSchema: false, hasDefinition: false }],
			}),
			createEndpoint({
				filePath: path.join(tempDir, 'src', 'routes', 'api', 'apple', '-api.server.ts'),
				routePath: 'apple',
				apiUrl: '/api/apple',
				methods: [{ method: 'GET', hasSchema: false, hasDefinition: false }],
			}),
		];
		await generateMcpRegistry(eps);

		const registryPath = path.join(tempDir, 'src', 'routes', 'api', 'mcp-registry.server.ts');
		const content = fs.readFileSync(registryPath, 'utf-8');
		const appleIndex = content.indexOf("path: '/api/apple'");
		const zooIndex = content.indexOf("path: '/api/zoo'");
		expect(appleIndex).toBeGreaterThan(-1);
		expect(zooIndex).toBeGreaterThan(-1);
		expect(appleIndex).toBeLessThan(zooIndex);
	});

	it('should include generated marker', async () => {
		const ep = createEndpoint();
		await generateMcpRegistry([ep]);

		const registryPath = path.join(tempDir, 'src', 'routes', 'api', 'mcp-registry.server.ts');
		const content = fs.readFileSync(registryPath, 'utf-8');
		expect(content.startsWith('// @generated by @yuanlu_yl/vite-sveltekit-many-api')).toBe(true);
	});

	it('should return false when content unchanged', async () => {
		const ep = createEndpoint();
		await generateMcpRegistry([ep]);
		const written = await generateMcpRegistry([ep]);
		expect(written).toBe(false);
	});
});
