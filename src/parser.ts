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

		// 解析 nMETHOD（自定义名称）—— 保持正则提取
		let customName: string | undefined;
		if (exportNames.has(`n${method}`)) {
			const re = new RegExp(`export\\s+(?:const|let|var)\\s+n${method}\\s*=\\s*(['"])([^'"]*?)\\1`);
			const match = content.match(re);
			if (match) customName = match[2];
		}

		// 解析 dMETHOD（描述和 MCP 配置）
		let description: string | undefined;
		let mcp: MethodInfo['mcp'] | undefined;

		if (exportNames.has(`d${method}`)) {
			// dMETHOD 是对象导出，提取其中的 description 字符串字面量
			// 以及 mcp 配置中的 category 等简单字符串
			const descRe = new RegExp(
				`export\\s+(?:const|let|var)\\s+d${method}\\s*=\\s*\\{[^}]*description\\s*:\\s*(['"])([^'"]*?)\\1`,
			);
			const descMatch = content.match(descRe);
			if (descMatch) description = descMatch[2];

			// 检查是否有 mcp 字段（简单正则判断存在性）
			const mcpRe = new RegExp(`export\\s+(?:const|let|var)\\s+d${method}\\s*=\\s*\\{[^}]*mcp\\s*:`);
			if (mcpRe.test(content)) {
				// mcp 配置作为对象整体导入，具体值运行时获取
				mcp = {};
			}
		}

		// 标记是否有 dMETHOD 导出（无论是否提取到具体内容）
		const hasDMethod = exportNames.has(`d${method}`);

		methods.push({
			method: method as HttpMethod,
			hasSchema: schemaExists,
			description: hasDMethod ? (description ?? '<imported>') : undefined,
			customName,
			mcp: hasDMethod ? mcp : undefined,
		});
	}
	return methods;
}
