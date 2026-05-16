import { GENERATED_MARKER, ESLINT_IGNORE_ALL, REMOTE_FILE, API_NAME, LOG_PREFIX } from '../config.js';
import { writeIfChanged, removeGeneratedFile } from '../file-writer.js';
import { getRoutePath } from '../path-utils.js';
import { parseApiExports } from '../parser.js';
import type { EndpointInfo } from '../types.js';
import path from 'node:path';
import fs from 'node:fs';

/**
 * 生成 `api.remote.ts` 内容（SvelteKit 远程函数）。
 *
 * GET 使用 `query`，其他变更方法使用 `command`。
 * 导出名默认为 `{routePath}_{method}`，可通过 `nMETHOD` 覆盖。
 */
export function generateRemoteFile(apiFileName: string, methods: EndpointInfo['methods'], routePath: string): string {
	const validMethods = methods.filter((m) => m.customName !== '');
	const needsQuery = validMethods.some((m) => m.method === 'GET');
	const needsCommand = validMethods.some((m) => m.method !== 'GET');

	const appImports: string[] = [];
	if (needsQuery) appImports.push('query');
	if (needsCommand) appImports.push('command');

	const apiImportItems: string[] = [];
	for (const { method, hasSchema } of validMethods) {
		apiImportItems.push(method);
		if (hasSchema) apiImportItems.push(`z${method}`);
	}

	let code = GENERATED_MARKER;
	code += ESLINT_IGNORE_ALL;
	code += `import { ${appImports.join(', ')} } from '$app/server';\n`;
	code += `import { ${apiImportItems.join(', ')} } from './${apiFileName}';\n`;

	for (const { method, hasSchema, customName } of validMethods) {
		const fn = method === 'GET' ? 'query' : 'command';
		const exportName = customName ?? `${routePath}_${method.toLowerCase()}`;
		code += '\n';
		if (hasSchema) {
			code += `export const ${exportName} = ${fn}(z${method}, ${method});\n`;
		} else {
			code += `export const ${exportName} = ${fn}(${method});\n`;
		}
	}

	return code;
}

/**
 * 处理单个 `-api.server.ts` 文件：生成 `api.remote.ts`。
 */
export async function processRemoteFile(filePath: string): Promise<void> {
	const dir = path.dirname(filePath);
	const basename = path.basename(filePath);

	if (basename !== API_NAME) return;

	const apiFileName = basename.replace(/\.ts$/, '');

	let methods: EndpointInfo['methods'];
	try {
		methods = await parseApiExports(filePath);
	} catch (err) {
		console.error(`${LOG_PREFIX} 解析失败 ${filePath}:`, err);
		return;
	}

	const remotePath = path.join(dir, REMOTE_FILE);

	// 没有导出任何 METHOD 时，删除已有的生成文件
	if (methods.length === 0) {
		await removeGeneratedFile(remotePath);
		return;
	}

	// 避免覆盖非生成文件
	if (fs.existsSync(remotePath)) {
		const existing = fs.readFileSync(remotePath, 'utf-8');
		if (!existing.startsWith(GENERATED_MARKER)) {
			console.warn(`${LOG_PREFIX} 跳过 ${path.relative(process.cwd(), remotePath)} — 非生成文件`);
			return;
		}
	}

	let remoteContent: string;
	try {
		remoteContent = generateRemoteFile(apiFileName, methods, getRoutePath(filePath));
	} catch (err) {
		console.error(`${LOG_PREFIX} 生成内容失败 ${filePath}:`, err);
		return;
	}

	await writeIfChanged(remotePath, remoteContent);
}
