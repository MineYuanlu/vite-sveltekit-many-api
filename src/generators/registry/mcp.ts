import path from 'node:path';
import { API_ROUTES_DIR, MCP_REGISTRY_FILE, GENERATED_MARKER, ESLINT_IGNORE_ALL } from '../../config.js';
import { writeIfChanged } from '../../file-writer.js';
import type { EndpointInfo } from '../../types.js';

/**
 * 生成 mcp-registry.server.ts 注册表文件
 *
 * 结构与 openapi-registry 类似，但包含 MCP 专属的 tool 定义。
 * 每个 tool 关联到对应的 API endpoint，并包含 MCP 配置（如 category、extraData）。
 */
export async function generateMcpRegistry(endpoints: EndpointInfo[]) {
	const apiDir = path.resolve(API_ROUTES_DIR);
	const registryPath = path.join(apiDir, MCP_REGISTRY_FILE);

	// 按路径排序，保持生成结果稳定
	const sorted = [...endpoints].sort((a, b) => a.routePath.localeCompare(b.routePath));

	const importLines: string[] = [];
	const entryLines: string[] = [];

	for (let fileIdx = 0; fileIdx < sorted.length; fileIdx++) {
		const ep = sorted[fileIdx];
		const prefix = `s${fileIdx}`;

		// 计算相对于 src/routes/api/ 的 import 路径
		const relPath = path.relative(apiDir, ep.filePath).replace(/\.ts$/, '');
		const importPath = './' + relPath.split(path.sep).join('/');

		// 收集该文件的所有 import 项
		const importItems: string[] = [];
		for (const m of ep.methods) {
			importItems.push(`${m.method} as ${prefix}_${m.method}`);
			if (m.hasSchema) importItems.push(`z${m.method} as ${prefix}_z${m.method}`);
			// dMETHOD 同时用于 OpenAPI 和 MCP，如有 mcp 配置则也需要导入
			if (m.description !== undefined || m.mcp !== undefined) {
				importItems.push(`d${m.method} as ${prefix}_d${m.method}`);
			}
		}

		if (importItems.length > 0) {
			importLines.push(`import { ${importItems.join(', ')} } from '${importPath}';`);
		}

		for (const m of ep.methods) {
			const handler = `${prefix}_${m.method}`;
			const operationId = m.customName ?? `${ep.routePath}_${m.method.toLowerCase()}`;
			const schemaValue = m.hasSchema ? `${prefix}_z${m.method}` : 'undefined';

			const dMethodRef = m.description !== undefined || m.mcp !== undefined ? `${prefix}_d${m.method}` : 'undefined';
			entryLines.push(`  {`);
			entryLines.push(`    name: '${operationId}',`);
			entryLines.push(`    inputSchema: ${schemaValue},`);
			entryLines.push(`    apiEndpoint: { path: '${ep.apiUrl}', method: '${m.method}' },`);
			entryLines.push(`    handler: ${handler},`);
			entryLines.push(`    definition: ${dMethodRef},`);
			entryLines.push(`  },`);
		}
	}

	const lines: string[] = [];
	lines.push(GENERATED_MARKER.trimEnd());
	lines.push(ESLINT_IGNORE_ALL.trimEnd());
	lines.push(`import type z from 'zod';`);
	for (const imp of importLines) lines.push(imp);
	lines.push('');
	lines.push('/** MCP 工具描述 */');
	lines.push('export interface McpTool {');
	lines.push('  /** 工具名称 */');
	lines.push('  name: string;');
	lines.push('  /** 工具输入的zod类型, 推荐为ZodObject类型 */');
	lines.push('  inputSchema?: z.ZodType;');
	lines.push('  /** 路径信息 */');
	lines.push('  apiEndpoint: { path: string; method: string };');
	lines.push('  /** 处理函数 */');
	lines.push('  handler: (args: any) => Promise<unknown>;');
	lines.push('  /** 接口配置 */');
	lines.push('  definition?: App.ApiMethodDef;');
	lines.push('}');
	lines.push('');
	lines.push('export const mcpTools: McpTool[] = [');
	for (const entry of entryLines) lines.push(entry);
	lines.push('];');
	lines.push('');

	const registryWritten = await writeIfChanged(registryPath, lines.join('\n'));
	return registryWritten;
}
