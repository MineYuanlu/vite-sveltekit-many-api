import fs from 'node:fs';
import { init, parse } from 'es-module-lexer';
import { HTTP_METHODS } from './config.js';
import type { MethodInfo } from './types.js';
import type { HttpMethod } from './config.js';

/**
 * 解析 `-api.server.ts` 文件，检测导出的 METHOD / zMETHOD / nMETHOD / dMETHOD。
 *
 * 识别以下模式：
 *   export const zGET = z.object(...)
 *   export async function GET(...)
 *   export function GET(...)
 *   export const GET = ...
 *   export const nGET = 'customName'
 *   export const dGET = { description: '...', mcp: { ... } }
 */
export async function parseApiExports(filePath: string): Promise<MethodInfo[]> {
	const content = await fs.promises.readFile(filePath, 'utf-8');
	await init;
	const [, exports] = parse(content);
	const exportNames = new Set(exports.map((exp) => exp.n));

	const methods: MethodInfo[] = [];
	for (const method of HTTP_METHODS) {
		const handlerExists = exportNames.has(method);
		if (!handlerExists) continue;
		const schemaExists = exportNames.has(`z${method}`);

		// 解析 nMETHOD（自定义名称）—— 正则提取字符串字面量
		let customName: string | undefined;
		if (exportNames.has(`n${method}`)) {
			const re = new RegExp(`export\\s+(?:const|let|var)\\s+n${method}\\s*=\\s*(['"])([^'"]*)\\1`);
			const match = content.match(re);
			if (match) customName = match[2];
		}

		// 标记是否有 dMETHOD 导出（运行时通过 import 获取元数据）
		const hasDefinition = exportNames.has(`d${method}`);

		methods.push({
			method: method as HttpMethod,
			hasSchema: schemaExists,
			hasDefinition,
			customName,
		});
	}
	return methods;
}
