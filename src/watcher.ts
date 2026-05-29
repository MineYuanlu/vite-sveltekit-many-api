import path from 'node:path';
import {
	API_ROUTES_DIR,
	API_NAME,
	LOG_PREFIX,
	SERVER_FILE,
	REMOTE_FILE,
	DEFAULT_UTIL_CONFIG,
	DEFAULT_GROUP_PATTERN,
} from './config.js';
import type { UtilConfig, GenerateConfig } from './config.js';
import { removeGeneratedFile, syncEndpointGitignore } from './file-writer.js';
import { processApiFile } from './scanner.js';
import { generateRegistryFiles } from './generators/registry/index.js';
import { resolveRealPath } from './path-utils.js';
import type { EndpointInfo } from './types.js';
import type { ViteDevServer } from 'vite';

export function setupWatcher(
	server: ViteDevServer,
	allEndpoints: Map<string, EndpointInfo>,
	util: UtilConfig = DEFAULT_UTIL_CONFIG,
	generate: GenerateConfig = {},
	apiDir: string = API_ROUTES_DIR,
	groupPattern: string = DEFAULT_GROUP_PATTERN,
) {
	const resolvedApiDir = resolveRealPath(path.resolve(apiDir));

	let registryDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	let registryDirty = false;

	const regenerateRegistry = async () => {
		registryDirty = false;
		const endpoints = Array.from(allEndpoints.values());
		await generateRegistryFiles(endpoints, apiDir, { groupPattern, generate });
	};

	const scheduleRegistryUpdate = () => {
		registryDirty = true;
		if (registryDebounceTimer) clearTimeout(registryDebounceTimer);
		registryDebounceTimer = setTimeout(() => {
			registryDebounceTimer = null;
			if (registryDirty) {
				regenerateRegistry().catch((err) => console.error(`${LOG_PREFIX} 注册表更新失败:`, err));
			}
		}, 50);
	};

	const handleFileChange = async (filePath: string) => {
		if (!filePath.startsWith(resolvedApiDir)) return;
		if (path.basename(filePath) !== API_NAME) return;

		console.log(`${LOG_PREFIX} 检测到文件变更: ${path.relative(process.cwd(), filePath)}`);

		// 独立文件：立即生成
		const ep = await processApiFile(filePath, util, generate, apiDir);
		if (ep) {
			allEndpoints.set(filePath, ep);
		} else {
			allEndpoints.delete(filePath);
		}

		// 注册表：去抖批量更新
		scheduleRegistryUpdate();
	};

	const handleFileUnlink = async (filePath: string) => {
		if (!filePath.startsWith(resolvedApiDir)) return;
		if (path.basename(filePath) !== API_NAME) return;

		console.log(`${LOG_PREFIX} 文件已删除: ${path.relative(process.cwd(), filePath)}`);
		const dir = path.dirname(filePath);
		const serverPath = path.join(dir, SERVER_FILE);
		const remotePath = path.join(dir, REMOTE_FILE);

		await removeGeneratedFile(serverPath);
		await removeGeneratedFile(remotePath);
		await syncEndpointGitignore(dir);

		allEndpoints.delete(filePath);
		scheduleRegistryUpdate();
	};

	console.log(`${LOG_PREFIX} 正在监听文件变更...`);

	server.watcher.on('change', handleFileChange);
	server.watcher.on('add', handleFileChange);
	server.watcher.on('unlink', handleFileUnlink);

	return {
		scheduleRegistryUpdate,
	};
}
