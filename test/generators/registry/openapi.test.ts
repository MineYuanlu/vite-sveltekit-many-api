import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { generateRegistry, generateRegistryMessages } from '../../../src/generators/registry/openapi.js';
import { createTempDir, cleanupTempDir } from '../../helpers.js';
import type { EndpointInfo } from '../../../src/types.js';

const DEFAULT_GROUP_PATTERN = '/api/v[^/]+/([^/]+)';

describe('generateRegistry', () => {
	let tempDir: string;
	let apiDir: string;
	let originalCwd: string;

	beforeEach(() => {
		tempDir = createTempDir();
		originalCwd = process.cwd();
		apiDir = path.join(tempDir, 'src', 'routes', 'api');
		fs.mkdirSync(apiDir, { recursive: true });
		process.chdir(tempDir);
	});

	afterEach(() => {
		process.chdir(originalCwd);
		cleanupTempDir(tempDir);
	});

	function createEndpoint(overrides: Partial<EndpointInfo> = {}): EndpointInfo {
		return {
			filePath: path.join(apiDir, '-api.server.ts'),
			routePath: '',
			apiUrl: '/api',
			methods: [{ method: 'GET', hasSchema: false, hasDefinition: false }],
			...overrides,
		};
	}

	it('should generate registry file for single endpoint', async () => {
		const ep = createEndpoint({ apiUrl: '/api/v1/task/list', routePath: 'v1_task_list' });
		const written = await generateRegistry([ep], apiDir, DEFAULT_GROUP_PATTERN);
		expect(written).toBe(true);

		const registryPath = path.join(apiDir, 'registry.server.ts');
		expect(fs.existsSync(registryPath)).toBe(true);

		const content = fs.readFileSync(registryPath, 'utf-8');
		expect(content).toContain('export const entries: ApiEntry[] = [');
		expect(content).toContain("path: '/api/v1/task/list'");
		expect(content).toContain("method: 'GET'");
		expect(content).toContain("operationId: 'v1_task_list_get'");
		expect(content).toContain("group: 'task'");
		expect(content).toContain('usesBody: false');
		expect(content).toContain('handler: s0_GET');
	});

	it('should generate registry with schema and definition imports', async () => {
		const ep = createEndpoint({
			filePath: path.join(apiDir, 'hello', '-api.server.ts'),
			routePath: 'hello',
			apiUrl: '/api/v1/hello',
			methods: [{ method: 'POST', hasSchema: true, hasDefinition: true }],
		});
		const written = await generateRegistry([ep], apiDir, DEFAULT_GROUP_PATTERN);
		expect(written).toBe(true);

		const content = fs.readFileSync(path.join(apiDir, 'registry.server.ts'), 'utf-8');
		expect(content).toContain('POST as s0_POST');
		expect(content).toContain('zPOST as s0_zPOST');
		expect(content).toContain('dPOST as s0_dPOST');
		expect(content).toContain("operationId: 'hello_post'");
		expect(content).toContain('usesBody: true');
		expect(content).toContain('schema: s0_zPOST');
		expect(content).toContain('definition: s0_dPOST');
		expect(content).toContain('handler: s0_POST');
	});

	it('should use custom name in operationId', async () => {
		const ep = createEndpoint({
			filePath: path.join(apiDir, 'hello', '-api.server.ts'),
			routePath: 'hello',
			apiUrl: '/api/v1/hello',
			methods: [{ method: 'GET', hasSchema: false, customName: 'fetchHello', hasDefinition: false }],
		});
		await generateRegistry([ep], apiDir, DEFAULT_GROUP_PATTERN);

		const content = fs.readFileSync(path.join(apiDir, 'registry.server.ts'), 'utf-8');
		expect(content).toContain("operationId: 'fetchHello'");
	});

	it('should extract group from apiUrl using groupPattern', async () => {
		const eps = [
			createEndpoint({ apiUrl: '/api/v1/task/list', routePath: 'v1_task_list' }),
			createEndpoint({
				filePath: path.join(apiDir, 'v1', 'data', '-api.server.ts'),
				routePath: 'v1_data',
				apiUrl: '/api/v1/data/push',
				methods: [{ method: 'POST', hasSchema: false, hasDefinition: false }],
			}),
		];
		await generateRegistry(eps, apiDir, DEFAULT_GROUP_PATTERN);

		const content = fs.readFileSync(path.join(apiDir, 'registry.server.ts'), 'utf-8');
		expect(content).toContain("group: 'task'");
		expect(content).toContain("group: 'data'");
	});

	it('should sort endpoints by routePath', async () => {
		const eps = [
			createEndpoint({ filePath: path.join(apiDir, 'zoo', '-api.server.ts'), routePath: 'zoo', apiUrl: '/api/zoo' }),
			createEndpoint({
				filePath: path.join(apiDir, 'apple', '-api.server.ts'),
				routePath: 'apple',
				apiUrl: '/api/apple',
			}),
		];
		await generateRegistry(eps, apiDir, DEFAULT_GROUP_PATTERN);

		const content = fs.readFileSync(path.join(apiDir, 'registry.server.ts'), 'utf-8');
		const appleIndex = content.indexOf("path: '/api/apple'");
		const zooIndex = content.indexOf("path: '/api/zoo'");
		expect(appleIndex).toBeGreaterThan(-1);
		expect(zooIndex).toBeGreaterThan(-1);
		expect(appleIndex).toBeLessThan(zooIndex);
	});

	it('should handle multiple methods in single endpoint', async () => {
		const ep = createEndpoint({
			filePath: path.join(apiDir, 'hello', '-api.server.ts'),
			routePath: 'hello',
			apiUrl: '/api/v1/hello',
			methods: [
				{ method: 'GET', hasSchema: false, hasDefinition: false },
				{ method: 'POST', hasSchema: true, hasDefinition: false },
				{ method: 'DELETE', hasSchema: false, hasDefinition: false },
			],
		});
		await generateRegistry([ep], apiDir, DEFAULT_GROUP_PATTERN);

		const content = fs.readFileSync(path.join(apiDir, 'registry.server.ts'), 'utf-8');
		expect(content).toContain("method: 'GET'");
		expect(content).toContain("method: 'POST'");
		expect(content).toContain("method: 'DELETE'");
	});

	it('should include generated marker', async () => {
		const ep = createEndpoint();
		await generateRegistry([ep], apiDir, DEFAULT_GROUP_PATTERN);

		const content = fs.readFileSync(path.join(apiDir, 'registry.server.ts'), 'utf-8');
		expect(content.startsWith('// @generated by @yuanlu_yl/vite-sveltekit-many-api')).toBe(true);
	});

	it('should return false when content unchanged', async () => {
		const ep = createEndpoint();
		await generateRegistry([ep], apiDir, DEFAULT_GROUP_PATTERN);
		const written = await generateRegistry([ep], apiDir, DEFAULT_GROUP_PATTERN);
		expect(written).toBe(false);
	});
});

describe('generateRegistryMessages', () => {
	let tempDir: string;
	let apiDir: string;
	let originalCwd: string;

	beforeEach(() => {
		tempDir = createTempDir();
		originalCwd = process.cwd();
		apiDir = path.join(tempDir, 'src', 'routes', 'api');
		fs.mkdirSync(apiDir, { recursive: true });
		process.chdir(tempDir);
	});

	afterEach(() => {
		process.chdir(originalCwd);
		cleanupTempDir(tempDir);
	});

	function createEndpoint(apiUrl: string, routePath: string): EndpointInfo {
		return {
			filePath: path.join(apiDir, '-api.server.ts'),
			routePath,
			apiUrl,
			methods: [{ method: 'GET', hasSchema: false, hasDefinition: false }],
		};
	}

	it('should generate messages file with default config', async () => {
		const eps = [
			createEndpoint('/api/v1/task/list', 'v1_task_list'),
			createEndpoint('/api/v1/data/push', 'v1_data_push'),
		];
		const written = await generateRegistryMessages(eps, apiDir, DEFAULT_GROUP_PATTERN, {});
		expect(written).toBe(true);

		const messagesPath = path.join(apiDir, 'registry.messages.ts');
		expect(fs.existsSync(messagesPath)).toBe(true);

		const content = fs.readFileSync(messagesPath, 'utf-8');
		expect(content).toContain("import { m } from '$lib/paraglide/messages';");
		expect(content).toContain('GROUP_LABELS');
		expect(content).toContain("data: m['group.data']");
		expect(content).toContain("task: m['group.task']");
	});

	it('should use custom keyPrefix', async () => {
		const eps = [createEndpoint('/api/v1/task/list', 'v1_task_list')];
		await generateRegistryMessages(eps, apiDir, DEFAULT_GROUP_PATTERN, {
			keyPrefix: 'page.schema.group',
		});

		const content = fs.readFileSync(path.join(apiDir, 'registry.messages.ts'), 'utf-8');
		expect(content).toContain("task: m['page.schema.group.task']");
	});

	it('should use custom from and export', async () => {
		const eps = [createEndpoint('/api/v1/task/list', 'v1_task_list')];
		await generateRegistryMessages(eps, apiDir, DEFAULT_GROUP_PATTERN, {
			from: '$lib/i18n',
			export: 't',
			returnType: 'string',
		});

		const content = fs.readFileSync(path.join(apiDir, 'registry.messages.ts'), 'utf-8');
		expect(content).toContain("import { t } from '$lib/i18n';");
		expect(content).toContain("task: t['group.task']");
	});

	it('should include type import when returnType is not string', async () => {
		const eps = [createEndpoint('/api/v1/task/list', 'v1_task_list')];
		await generateRegistryMessages(eps, apiDir, DEFAULT_GROUP_PATTERN, {
			returnType: 'LocalizedString',
		});

		const content = fs.readFileSync(path.join(apiDir, 'registry.messages.ts'), 'utf-8');
		expect(content).toContain('type LocalizedString');
		expect(content).toContain('Record<string, () => LocalizedString>');
	});

	it('should deduplicate and sort groups', async () => {
		const eps = [
			createEndpoint('/api/v1/task/list', 'v1_task_list'),
			createEndpoint('/api/v1/task/create', 'v1_task_create'),
			createEndpoint('/api/v1/data/push', 'v1_data_push'),
		];
		await generateRegistryMessages(eps, apiDir, DEFAULT_GROUP_PATTERN, {});

		const content = fs.readFileSync(path.join(apiDir, 'registry.messages.ts'), 'utf-8');
		const dataIndex = content.indexOf('data:');
		const taskIndex = content.indexOf('task:');
		expect(dataIndex).toBeLessThan(taskIndex);
		// task should appear only once (deduplicated)
		expect(content.indexOf('task:', taskIndex + 1)).toBe(-1);
	});

	it('should return false when content unchanged', async () => {
		const eps = [createEndpoint('/api/v1/task/list', 'v1_task_list')];
		await generateRegistryMessages(eps, apiDir, DEFAULT_GROUP_PATTERN, {});
		const written = await generateRegistryMessages(eps, apiDir, DEFAULT_GROUP_PATTERN, {});
		expect(written).toBe(false);
	});
});
