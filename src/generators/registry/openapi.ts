import path from 'node:path';
import { API_ROUTES_DIR, usesBody, GENERATED_MARKER, ESLINT_IGNORE_ALL } from '../../config.js';
import { writeIfChanged } from '../../file-writer.js';
import { resolveRealPath } from '../../path-utils.js';
import type { EndpointInfo } from '../../types.js';
import type { StandardSchemaV1 } from '@standard-schema/spec';

/** OpenAPI 端点描述 */
export interface ApiEndpoint {
	path: string;
	method: string;
	operationId: string;
	description?: string;
	schema?: StandardSchemaV1;
	usesBody: boolean;
}

/**
 * 生成 openapi-registry.server.ts 注册表文件
 */
export async function generateOpenApiRegistry(endpoints: EndpointInfo[]) {
	const apiDir = resolveRealPath(path.resolve(API_ROUTES_DIR));
	const registryPath = path.join(apiDir, 'openapi-registry.server.ts');

	// 按路径排序
	const sorted = [...endpoints].sort((a, b) => a.routePath.localeCompare(b.routePath));

	const importLines: string[] = [];
	const entryLines: string[] = [];

	for (let fileIdx = 0; fileIdx < sorted.length; fileIdx++) {
		const ep = sorted[fileIdx];
		const prefix = `s${fileIdx}`;

		// 计算相对于 src/routes/api/ 的 import 路径
		const relPath = path.relative(apiDir, resolveRealPath(ep.filePath)).replace(/\.ts$/, '');
		const importPath = './' + relPath.split(path.sep).join('/');

		// 收集该文件的所有 import 项
		const importItems: string[] = [];
		for (const m of ep.methods) {
			if (m.hasSchema) importItems.push(`z${m.method} as ${prefix}_z${m.method}`);
			if (m.description !== undefined) importItems.push(`d${m.method} as ${prefix}_d${m.method}`);
		}

		if (importItems.length > 0) {
			importLines.push(`import { ${importItems.join(', ')} } from '${importPath}';`);
		}

		for (const m of ep.methods) {
			const operationId = m.customName ?? `${ep.routePath}_${m.method.toLowerCase()}`;
			const descriptionValue = m.description !== undefined ? `${prefix}_d${m.method}.description` : 'undefined';
			const schemaValue = m.hasSchema ? `${prefix}_z${m.method}` : 'undefined';

			entryLines.push('  {');
			entryLines.push(`    path: '${ep.apiUrl}',`);
			entryLines.push(`    method: '${m.method}',`);
			entryLines.push(`    operationId: '${operationId}',`);
			entryLines.push(`    description: ${descriptionValue},`);
			entryLines.push(`    schema: ${schemaValue},`);
			entryLines.push(`    usesBody: ${usesBody(m.method)},`);
			entryLines.push('  },');
		}
	}

	const lines: string[] = [];
	lines.push(GENERATED_MARKER.trimEnd());
	lines.push(ESLINT_IGNORE_ALL.trimEnd());
	lines.push('import type { ApiEndpoint } from \'@yuanlu_yl/vite-sveltekit-many-api\';');
	for (const imp of importLines) lines.push(imp);
	lines.push('');
	lines.push('export const endpoints: ApiEndpoint[] = [');
	for (const entry of entryLines) lines.push(entry);
	lines.push('];');
	lines.push('');

	const registryWritten = await writeIfChanged(registryPath, lines.join('\n'));
	return registryWritten;
}
