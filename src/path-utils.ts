import path from 'node:path';
import fs from 'node:fs';
import { API_ROUTES_DIR } from './config.js';

export function resolveRealPath(p: string): string {
	try {
		return fs.realpathSync.native(p);
	} catch (err) {
		const code = (err as NodeJS.ErrnoException).code;
		if (code === 'ENOENT') {
			return path.resolve(p);
		}
		throw err;
	}
}

/** 从文件路径计算路由路径标识（如 v1_test） */
export function getRoutePath(filePath: string): string {
	const apiDir = resolveRealPath(path.resolve(API_ROUTES_DIR));
	const realFilePath = resolveRealPath(path.dirname(filePath));
	const rel = path.relative(apiDir, realFilePath);
	return rel.split(path.sep).filter(Boolean).join('_');
}

/** 从 routePath 生成 API URL 路径 */
export function getApiUrlPath(routePath: string): string {
	return '/api/' + routePath.replace(/_/g, '/');
}
