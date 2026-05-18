import { GENERATED_MARKER, ESLINT_IGNORE_ALL, SERVER_FILE, usesBody, LOG_PREFIX, API_NAME, DEFAULT_UTIL_CONFIG } from '../config.js';
import type { UtilConfig } from '../config.js';
import { writeIfChanged, removeGeneratedFile } from '../file-writer.js';
import { getRoutePath, getApiUrlPath } from '../path-utils.js';
import { parseApiExports } from '../parser.js';
import type { EndpointInfo } from '../types.js';
import path from 'node:path';
import fs from 'node:fs';

/**
 * 生成 `+server.ts` 内容。
 *
 * GET/DELETE — 通过 `parseSearchParams` 解析查询参数。
 * POST/PUT/PATCH — 通过 `parseBody` 解析请求体。
 */
export function generateServerFile(apiFileName: string, methods: EndpointInfo['methods'], utilImportPath: string): string {
	const lines: string[] = [];

	// 构建导入项：将处理函数别名为 _GET、_POST 等以避免命名冲突
	const apiImportItems: string[] = [];
	for (const { method, hasSchema } of methods) {
		apiImportItems.push(`${method} as _${method}`);
		if (hasSchema) apiImportItems.push(`z${method}`);
	}

	// 仅导入实际需要的解析辅助函数
	const needsBody = methods.some((m) => m.hasSchema && usesBody(m.method));
	const needsParams = methods.some((m) => m.hasSchema && !usesBody(m.method));
	const parseImports: string[] = ['success'];
	if (needsBody) parseImports.push('parseBody');
	if (needsParams) parseImports.push('parseSearchParams');

	lines.push('import type { RequestHandler } from \'./$types\';');
	lines.push(`import { ${parseImports.join(', ')} } from '${utilImportPath}';`);
	lines.push(`import { ${apiImportItems.join(', ')} } from './${apiFileName}';`);

	for (const { method, hasSchema } of methods) {
		lines.push('');
		if (hasSchema) {
			const parser = usesBody(method) ? 'parseBody' : 'parseSearchParams';
			lines.push(`export const ${method}: RequestHandler = async () => {`);
			lines.push(`\tconst params = await ${parser}(z${method});`);
			lines.push(`\tconst data = await _${method}(params);`);
			lines.push('\treturn success({ data });');
			lines.push('};');
		} else {
			lines.push(`export const ${method}: RequestHandler = async () => {`);
			lines.push(`\tconst data = await _${method}();`);
			lines.push('\treturn success({ data });');
			lines.push('};');
		}
	}

	return GENERATED_MARKER + ESLINT_IGNORE_ALL + lines.join('\n') + '\n';
}

/**
 * 处理单个 `-api.server.ts` 文件：生成 `+server.ts`。
 * 如果没有导出任何 METHOD，则删除已有的生成文件。
 */
export async function processServerFile(filePath: string, util: UtilConfig = DEFAULT_UTIL_CONFIG): Promise<EndpointInfo | undefined> {
	const dir = path.dirname(filePath);
	const basename = path.basename(filePath);

	if (basename !== API_NAME) return undefined;

	const apiFileName = basename.replace(/\.ts$/, '');

	let methods: EndpointInfo['methods'];
	try {
		methods = await parseApiExports(filePath);
	} catch (err) {
		console.error(`${LOG_PREFIX} 解析失败 ${filePath}:`, err);
		return undefined;
	}

	const serverPath = path.join(dir, SERVER_FILE);

	// 没有导出任何 METHOD 时，删除已有的生成文件
	if (methods.length === 0) {
		await removeGeneratedFile(serverPath);
		return undefined;
	}

	// 避免覆盖非生成文件
	if (fs.existsSync(serverPath)) {
		const existing = fs.readFileSync(serverPath, 'utf-8');
		if (!existing.startsWith(GENERATED_MARKER)) {
			console.warn(`${LOG_PREFIX} 跳过 ${path.relative(process.cwd(), serverPath)} — 非生成文件`);
			return undefined;
		}
	}

	const utilImportPath = util.imp ?? DEFAULT_UTIL_CONFIG.imp;

	let serverContent: string;
	try {
		serverContent = generateServerFile(apiFileName, methods, utilImportPath);
	} catch (err) {
		console.error(`${LOG_PREFIX} 生成内容失败 ${filePath}:`, err);
		return undefined;
	}

	await writeIfChanged(serverPath, serverContent);

	const routePath = getRoutePath(filePath);
	return {
		filePath,
		routePath,
		apiUrl: getApiUrlPath(routePath),
		methods,
	};
}
