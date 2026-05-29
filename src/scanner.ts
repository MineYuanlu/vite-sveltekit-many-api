import fs from 'node:fs';
import path from 'node:path';
import { API_ROUTES_DIR, API_NAME, DEFAULT_UTIL_CONFIG } from './config.js';
import type { UtilConfig, GenerateConfig } from './config.js';
import { processServerFile } from './generators/server-file.js';
import { processRemoteFile } from './generators/remote-file.js';
import { parseApiExports } from './parser.js';
import { resolveRealPath, getRoutePath, getApiUrlPath } from './path-utils.js';
import type { EndpointInfo } from './types.js';

/**
 * 扫描所有 `-api.server.ts` 文件并返回路径列表。
 */
export function scanAllApiFiles(apiDir: string = API_ROUTES_DIR): string[] {
	const watchDir = resolveRealPath(path.resolve(apiDir));
	if (!fs.existsSync(watchDir)) return [];

	const files: string[] = [];
	function walkDir(dir: string) {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				walkDir(full);
			} else if (entry.isFile() && path.basename(entry.name) === API_NAME) {
				files.push(resolveRealPath(full));
			}
		}
	}
	walkDir(watchDir);
	return files;
}

/**
 * 仅解析 API 文件，不生成任何磁盘文件。
 * 当 generate.server === false 时用于获取端点信息。
 */
async function parseEndpointOnly(filePath: string, apiDir: string): Promise<EndpointInfo | undefined> {
	try {
		const methods = await parseApiExports(filePath);
		if (!methods.length) return undefined;
		const routePath = getRoutePath(filePath, apiDir);
		return { filePath, routePath, apiUrl: getApiUrlPath(routePath), methods };
	} catch {
		return undefined;
	}
}

/**
 * 处理单个 API 文件：按 generate 开关生成 server-file 和/或 remote-file。
 */
export async function processApiFile(
	filePath: string,
	util: UtilConfig = DEFAULT_UTIL_CONFIG,
	generate: Pick<GenerateConfig, 'server' | 'remote'> = {},
	apiDir: string = API_ROUTES_DIR,
): Promise<EndpointInfo | undefined> {
	const generateServer = generate.server !== false;
	const generateRemote = generate.remote !== false;

	if (generateServer) {
		// processServerFile 负责解析 + 生成 server 文件，返回 EndpointInfo
		const [serverEp] = await Promise.all([
			processServerFile(filePath, util, apiDir),
			generateRemote ? processRemoteFile(filePath, apiDir) : Promise.resolve(),
		]);
		return serverEp;
	}

	// server 关闭时：仅解析，不生成 server 文件；remote 独立按开关处理
	const [ep] = await Promise.all([
		parseEndpointOnly(filePath, apiDir),
		generateRemote ? processRemoteFile(filePath, apiDir) : Promise.resolve(),
	]);
	return ep;
}

/**
 * 全量扫描并处理所有 API 文件。
 */
export async function scanAll(
	util: UtilConfig = DEFAULT_UTIL_CONFIG,
	generate: Pick<GenerateConfig, 'server' | 'remote'> = {},
	apiDir: string = API_ROUTES_DIR,
): Promise<EndpointInfo[]> {
	const files = scanAllApiFiles(apiDir);

	const results = await Promise.all(files.map((file) => processApiFile(file, util, generate, apiDir)));
	return results.filter((ep): ep is EndpointInfo => ep !== undefined);
}
