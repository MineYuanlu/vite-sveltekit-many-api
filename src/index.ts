import type { Plugin } from 'vite';
import { loadConfigFromFile } from 'vite';
import { LOG_PREFIX, DEFAULT_UTIL_CONFIG } from './config.js';
import type { ApiRoutesConfig, UtilConfig } from './config.js';
import { scanAll } from './scanner.js';
import { setupWatcher } from './watcher.js';
import { generateRegistryFiles } from './generators/registry/index.js';
import { ensureUtilTemplate } from './file-writer.js';
import type { EndpointInfo } from './types.js';

// 导出类型定义供用户项目使用
export type { ApiMethodDef, StandardSchemaV1 } from './types.js';
export type { ApiEndpoint } from './generators/registry/openapi.js';
export type { McpTool } from './generators/registry/mcp.js';
export type { ApiRoutesConfig, UtilConfig } from './config.js';

const PLUGIN_NAME = '@yuanlu_yl/vite-sveltekit-many-api';

function mergeUtil(config: ApiRoutesConfig = {}): UtilConfig {
	return {
		path: config.util?.path ?? DEFAULT_UTIL_CONFIG.path,
		imp: config.util?.imp ?? DEFAULT_UTIL_CONFIG.imp,
		schema: config.util?.schema ?? DEFAULT_UTIL_CONFIG.schema,
	};
}

export function apiRoutes(config: ApiRoutesConfig = {}): Plugin {
	const util = mergeUtil(config);

	// 维护所有端点的内存状态，用于增量更新注册表
	const allEndpoints = new Map<string, EndpointInfo>();

	return {
		name: PLUGIN_NAME,
		// @ts-expect-error 暴露原始配置供 CLI 读取
		__apiRoutesConfig: config,
		async buildStart() {
			// 确保 util 模板文件存在
			await ensureUtilTemplate(util);

			// 构建时全量扫描
			console.log(`${LOG_PREFIX} 构建模式：扫描 API 文件...`);
			const endpoints = await scanAll(util);
			endpoints.forEach((ep) => allEndpoints.set(ep.filePath, ep));
			await generateRegistryFiles(endpoints);
			console.log(`${LOG_PREFIX} 构建扫描完成，共 ${endpoints.length} 个端点`);
		},
		configResolved(config) {
			// 仅开发模式在配置阶段扫描；构建模式由 buildStart 负责，避免并发冲突
			if (config.command === 'serve') {
				console.log(`${LOG_PREFIX} 开发模式：正在扫描 API 文件...`);

				// 确保 util 模板文件存在
				ensureUtilTemplate(util).then(() => {
					scanAll(util)
						.then((endpoints) => {
							endpoints.forEach((ep) => allEndpoints.set(ep.filePath, ep));
							return generateRegistryFiles(endpoints);
						})
						.then(() => {
							console.log(`${LOG_PREFIX} 初始扫描完成，共 ${allEndpoints.size} 个端点`);
						})
						.catch((err) => console.error(`${LOG_PREFIX} 扫描出错:`, err));
				});
			}
		},
		configureServer(server) {
			setupWatcher(server, allEndpoints, util);
		},
	};
}

async function runCli() {
	// 解析参数：支持 `generate` 和 `--config <path>`
	const args = process.argv.slice(2);
	const generateIndex = args.indexOf('generate');
	if (generateIndex === -1) return;

	// 查找 --config 参数
	const configFlagIndex = args.indexOf('--config');
	const configFile = configFlagIndex !== -1 ? args[configFlagIndex + 1] : undefined;

	console.log(`${LOG_PREFIX} CLI 模式：扫描 API 文件...`);

	// 加载 vite 配置以提取 apiRoutes 的配置
	let pluginConfig: ApiRoutesConfig = {};
	try {
		const loaded = await loadConfigFromFile(
			{ command: 'build', mode: 'production' },
			configFile,
			process.cwd(),
		);
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

	const util = mergeUtil(pluginConfig);

	await ensureUtilTemplate(util);
	const endpoints = await scanAll(util);
	await generateRegistryFiles(endpoints);
	console.log(`${LOG_PREFIX} 生成完成`);
}

if (process.argv[2] === 'generate') {
	runCli().catch((err) => {
		console.error(`${LOG_PREFIX} 扫描出错:`, err);
		process.exit(1);
	});
}
