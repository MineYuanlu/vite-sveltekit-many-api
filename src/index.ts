import type { Plugin } from 'vite';
import { LOG_PREFIX } from './config.js';
import { scanAll } from './scanner.js';
import { setupWatcher } from './watcher.js';
import { generateRegistryFiles } from './generators/registry/index.js';
import type { EndpointInfo } from './types.js';

export function apiRoutes(): Plugin {
	// 维护所有端点的内存状态，用于增量更新注册表
	const allEndpoints = new Map<string, EndpointInfo>();

	return {
		name: 'vite-plugin-api-routes',
		async buildStart() {
			// 构建时全量扫描
			console.log(`${LOG_PREFIX} 构建模式：扫描 API 文件...`);
			const endpoints = await scanAll();
			endpoints.forEach((ep) => allEndpoints.set(ep.filePath, ep));
			await generateRegistryFiles(endpoints);
			console.log(`${LOG_PREFIX} 构建扫描完成，共 ${endpoints.length} 个端点`);
		},
		configResolved(config) {
			// 仅开发模式在配置阶段扫描；构建模式由 buildStart 负责，避免并发冲突
			if (config.command === 'serve') {
				console.log(`${LOG_PREFIX} 开发模式：正在扫描 API 文件...`);
				scanAll()
					.then((endpoints) => {
						endpoints.forEach((ep) => allEndpoints.set(ep.filePath, ep));
						return generateRegistryFiles(endpoints);
					})
					.then(() => {
						console.log(`${LOG_PREFIX} 初始扫描完成，共 ${allEndpoints.size} 个端点`);
					})
					.catch((err) => console.error(`${LOG_PREFIX} 扫描出错:`, err));
			}
		},
		configureServer(server) {
			setupWatcher(server, allEndpoints);
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
