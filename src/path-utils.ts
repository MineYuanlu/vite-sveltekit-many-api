import path from 'node:path';
import { API_ROUTES_DIR } from './config.js';

/** 从文件路径计算路由路径标识（如 v1_test） */
export function getRoutePath(filePath: string): string {
	const rel = path.relative(path.resolve(API_ROUTES_DIR), path.dirname(filePath));
	return rel.split(path.sep).filter(Boolean).join('_');
}

/** 从 routePath 生成 API URL 路径 */
export function getApiUrlPath(routePath: string): string {
	return '/api/' + routePath.replace(/_/g, '/');
}
