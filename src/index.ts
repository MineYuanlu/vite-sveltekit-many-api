import type { Plugin } from 'vite';
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

export function apiRoutes(config: ApiRoutesConfig = {}): Plugin {
	// 合并 util 配置
	const util: UtilConfig = {
		path: config.util?.path ?? DEFAULT_UTIL_CONFIG.path,
		imp: config.util?.imp ?? DEFAULT_UTIL_CONFIG.imp,
		schema: config.util?.schema ?? DEFAULT_UTIL_CONFIG.schema,
	};

	// 维护所有端点的内存状态，用于增量更新注册表
	const allEndpoints = new Map<string, EndpointInfo>();

	return {
		name: '@yuanlu_yl/vite-sveltekit-many-api',
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

if (process.argv[2] === 'generate') {
	console.log(`${LOG_PREFIX} CLI 模式：扫描 API 文件...`);
	scanAll()
		.then((endpoints) => generateRegistryFiles(endpoints))
		.then(() => console.log(`${LOG_PREFIX} 生成完成`))
		.catch((err) => {
			console.error(`${LOG_PREFIX} 扫描出错:`, err);
			process.exit(1);
		});
}
