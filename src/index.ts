import type { Plugin } from 'vite';
import { loadConfigFromFile } from 'vite';
import {
	LOG_PREFIX,
	DEFAULT_UTIL_CONFIG,
	DEFAULT_GENERATE_CONFIG,
	DEFAULT_GROUP_PATTERN,
	API_ROUTES_DIR,
} from './config.js';
import type { ApiRoutesConfig, UtilConfig, GenerateConfig } from './config.js';
import { scanAll } from './scanner.js';
import { setupWatcher } from './watcher.js';
import { generateRegistryFiles } from './generators/registry/index.js';
import { ensureUtilTemplate } from './file-writer.js';
import type { EndpointInfo } from './types.js';

// 导出类型定义供用户项目使用
export type { ApiMethodDef, StandardSchemaV1 } from './types.js';
export type { ApiEntry } from './generators/registry/openapi.js';
export type { ApiRoutesConfig, UtilConfig, GenerateConfig, MessagesConfig } from './config.js';

const PLUGIN_NAME = '@yuanlu_yl/vite-sveltekit-many-api';

interface ResolvedConfig {
	util: UtilConfig;
	generate: GenerateConfig;
	apiDir: string;
	groupPattern: string;
}

function resolveConfig(config: ApiRoutesConfig = {}): ResolvedConfig {
	return {
		util: {
			path: config.util?.path ?? DEFAULT_UTIL_CONFIG.path,
			imp: config.util?.imp ?? DEFAULT_UTIL_CONFIG.imp,
			schema: config.util?.schema ?? DEFAULT_UTIL_CONFIG.schema,
		},
		generate: {
			server: config.generate?.server ?? DEFAULT_GENERATE_CONFIG.server,
			remote: config.generate?.remote ?? DEFAULT_GENERATE_CONFIG.remote,
			registry: config.generate?.registry ?? DEFAULT_GENERATE_CONFIG.registry,
			messages: config.generate?.messages ?? DEFAULT_GENERATE_CONFIG.messages,
		},
		apiDir: config.apiDir ?? API_ROUTES_DIR,
		groupPattern: config.groupPattern ?? DEFAULT_GROUP_PATTERN,
	};
}

export function apiRoutes(config: ApiRoutesConfig = {}): Plugin {
	const resolved = resolveConfig(config);

	// 维护所有端点的内存状态，用于增量更新注册表
	const allEndpoints = new Map<string, EndpointInfo>();

	return {
		name: PLUGIN_NAME,
		// @ts-expect-error 暴露原始配置供 CLI 读取
		__apiRoutesConfig: config,
		async buildStart() {
			await ensureUtilTemplate(resolved.util);

			console.log(`${LOG_PREFIX} 构建模式：扫描 API 文件...`);
			const endpoints = await scanAll(resolved.util, resolved.generate, resolved.apiDir);
			endpoints.forEach((ep) => allEndpoints.set(ep.filePath, ep));
			await generateRegistryFiles(endpoints, resolved.apiDir, {
				groupPattern: resolved.groupPattern,
				generate: resolved.generate,
			});
			console.log(`${LOG_PREFIX} 构建扫描完成，共 ${endpoints.length} 个端点`);
		},
		configResolved(viteConfig) {
			if (viteConfig.command === 'serve') {
				console.log(`${LOG_PREFIX} 开发模式：正在扫描 API 文件...`);

				ensureUtilTemplate(resolved.util).then(() => {
					scanAll(resolved.util, resolved.generate, resolved.apiDir)
						.then((endpoints) => {
							endpoints.forEach((ep) => allEndpoints.set(ep.filePath, ep));
							return generateRegistryFiles(endpoints, resolved.apiDir, {
								groupPattern: resolved.groupPattern,
								generate: resolved.generate,
							});
						})
						.then(() => {
							console.log(`${LOG_PREFIX} 初始扫描完成，共 ${allEndpoints.size} 个端点`);
						})
						.catch((err) => console.error(`${LOG_PREFIX} 扫描出错:`, err));
				});
			}
		},
		configureServer(server) {
			setupWatcher(server, allEndpoints, resolved.util, resolved.generate, resolved.apiDir, resolved.groupPattern);
		},
	};
}

async function runCli() {
	const args = process.argv.slice(1);
	const generateIndex = args.indexOf('generate');
	if (generateIndex === -1) return;

	const configFlagIndex = args.indexOf('--config');
	const configFile = configFlagIndex !== -1 ? args[configFlagIndex + 1] : undefined;

	console.log(`${LOG_PREFIX} CLI 模式：扫描 API 文件...`);

	let pluginConfig: ApiRoutesConfig = {};
	try {
		const loaded = await loadConfigFromFile({ command: 'build', mode: 'production' }, configFile, process.cwd());
		if (loaded) {
			for (const p of loaded.config.plugins || []) {
				const plugin = typeof p === 'function' ? (p as unknown as () => unknown)() : p;
				if (plugin && (plugin as any).name === PLUGIN_NAME) {
					pluginConfig = (plugin as any).__apiRoutesConfig ?? {};
					console.log(`${LOG_PREFIX} 已从 vite 配置加载 apiRoutes 配置`);
					break;
				}
			}
		}
	} catch (e) {
		console.warn(`${LOG_PREFIX} 加载 vite 配置失败，使用默认配置:`, e);
	}

	const resolved = resolveConfig(pluginConfig);

	await ensureUtilTemplate(resolved.util);
	const endpoints = await scanAll(resolved.util, resolved.generate, resolved.apiDir);
	await generateRegistryFiles(endpoints, resolved.apiDir, {
		groupPattern: resolved.groupPattern,
		generate: resolved.generate,
	});
	console.log(`${LOG_PREFIX} 生成完成`);
}

// Guard against double-invocation: loadConfigFromFile re-imports this module via ESM,
// which would re-trigger the CLI. process.env is shared across all modules in the process.
if (process.argv.slice(1).includes('generate') && !process.env['__API_ROUTES_CLI_RAN__']) {
	process.env['__API_ROUTES_CLI_RAN__'] = '1';
	runCli().catch((err) => {
		console.error(`${LOG_PREFIX} 扫描出错:`, err);
		process.exit(1);
	});
}
