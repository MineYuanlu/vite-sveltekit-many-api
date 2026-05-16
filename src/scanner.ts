import fs from 'node:fs';
import path from 'node:path';
import { API_ROUTES_DIR, API_NAME, DEFAULT_UTIL_CONFIG } from './config.js';
import type { UtilConfig } from './config.js';
import { processServerFile } from './generators/server-file.js';
import { processRemoteFile } from './generators/remote-file.js';
import { resolveRealPath } from './path-utils.js';
import type { EndpointInfo } from './types.js';

/**
 * 扫描所有 `-api.server.ts` 文件并处理。
 * @returns 所有有效的端点信息
 */
export function scanAllApiFiles(): string[] {
	const watchDir = resolveRealPath(path.resolve(API_ROUTES_DIR));
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
 * 处理单个 API 文件：生成 server-file 和 remote-file。
 */
export async function processApiFile(filePath: string, util: UtilConfig = DEFAULT_UTIL_CONFIG): Promise<EndpointInfo | undefined> {
	// 并行生成 server 和 remote 文件
	const [serverEp] = await Promise.all([processServerFile(filePath, util), processRemoteFile(filePath)]);

	return serverEp;
}

/**
 * 全量扫描并处理所有 API 文件。
 */
export async function scanAll(util: UtilConfig = DEFAULT_UTIL_CONFIG): Promise<EndpointInfo[]> {
	const files = scanAllApiFiles();

	// 并发处理文件，错误隔离
	const results = await Promise.all(files.map((file) => processApiFile(file, util)));
	const endpoints = results.filter((ep): ep is EndpointInfo => ep !== undefined);

	return endpoints;
}
