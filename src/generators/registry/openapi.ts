import path from 'node:path';
import {
	REGISTRY_FILE,
	REGISTRY_MESSAGES_FILE,
	usesBody,
	GENERATED_MARKER,
	ESLINT_IGNORE_ALL,
	DEFAULT_MESSAGES_CONFIG,
} from '../../config.js';
import type { MessagesConfig } from '../../config.js';
import { writeIfChanged } from '../../file-writer.js';
import { resolveRealPath } from '../../path-utils.js';
import type { EndpointInfo } from '../../types.js';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { ApiMethodDef } from '../../types.js';

/** 统一 API 端点描述 */
export interface ApiEntry {
	path: string;
	method: string;
	operationId: string;
	/** 分组标识，由 API URL 自动提取 */
	group: string;
	description?: string;
	schema?: StandardSchemaV1;
	definition?: ApiMethodDef;
	usesBody: boolean;
	/** 内部处理函数；手写 +server.ts 的路由不存在此字段时，消费方可回退到 fetch */
	handler?: (args: any) => unknown | Promise<unknown>;
}

/** 从 API URL 中提取分组标识 */
function extractGroup(apiUrl: string, pattern: string): string {
	const match = apiUrl.match(new RegExp(pattern));
	return match?.[1] ?? apiUrl;
}

/**
 * 生成统一的 registry.server.ts 注册表文件
 *
 * 合并了原 openapi-registry 和 mcp-registry 的信息：
 * - group: 由 API URL 自动提取
 * - handler: 来自 METHOD 导出
 * - definition: 来自 dMETHOD 导出
 */
export async function generateRegistry(
	endpoints: EndpointInfo[],
	apiDir: string,
	groupPattern: string,
): Promise<boolean> {
	const resolvedDir = resolveRealPath(path.resolve(apiDir));
	const registryPath = path.join(resolvedDir, REGISTRY_FILE);

	// 按路径排序，保持生成结果稳定
	const sorted = [...endpoints].sort((a, b) => a.routePath.localeCompare(b.routePath));

	const importLines: string[] = [];
	const entryLines: string[] = [];

	for (let fileIdx = 0; fileIdx < sorted.length; fileIdx++) {
		const ep = sorted[fileIdx];
		const prefix = `s${fileIdx}`;

		// 计算相对于 apiDir 的 import 路径
		const relPath = path.relative(resolvedDir, resolveRealPath(ep.filePath)).replace(/\.ts$/, '');
		const importPath = './' + relPath.split(path.sep).join('/');

		// 收集该文件的所有 import 项
		const importItems: string[] = [];
		for (const m of ep.methods) {
			importItems.push(`${m.method} as ${prefix}_${m.method}`); // handler
			if (m.hasSchema) importItems.push(`z${m.method} as ${prefix}_z${m.method}`);
			if (m.hasDefinition) importItems.push(`d${m.method} as ${prefix}_d${m.method}`);
		}

		if (importItems.length > 0) {
			importLines.push(`import { ${importItems.join(', ')} } from '${importPath}';`);
		}

		for (const m of ep.methods) {
			const operationId = m.customName ?? `${ep.routePath}_${m.method.toLowerCase()}`;
			const descriptionValue = m.hasDefinition ? `${prefix}_d${m.method}.description` : 'undefined';
			const schemaValue = m.hasSchema ? `${prefix}_z${m.method}` : 'undefined';
			const defValue = m.hasDefinition ? `${prefix}_d${m.method}` : 'undefined';
			const group = extractGroup(ep.apiUrl, groupPattern);

			entryLines.push('  {');
			entryLines.push(`    path: '${ep.apiUrl}',`);
			entryLines.push(`    method: '${m.method}',`);
			entryLines.push(`    operationId: '${operationId}',`);
			entryLines.push(`    group: '${group}',`);
			entryLines.push(`    description: ${descriptionValue},`);
			entryLines.push(`    schema: ${schemaValue},`);
			entryLines.push(`    definition: ${defValue},`);
			entryLines.push(`    usesBody: ${usesBody(m.method)},`);
			entryLines.push(`    handler: ${prefix}_${m.method},`);
			entryLines.push('  },');
		}
	}

	const lines: string[] = [];
	lines.push(GENERATED_MARKER.trimEnd());
	lines.push(ESLINT_IGNORE_ALL.trimEnd());
	lines.push("import type { ApiEntry } from '@yuanlu_yl/vite-sveltekit-many-api';");
	for (const imp of importLines) lines.push(imp);
	lines.push('');
	lines.push('export const entries: ApiEntry[] = [');
	for (const entry of entryLines) lines.push(entry);
	lines.push('];');
	lines.push('');

	return await writeIfChanged(registryPath, lines.join('\n'));
}

/**
 * 生成 registry.messages.ts — 分组标签映射
 *
 * 收集所有唯一 group，生成 GROUP_LABELS 导出。
 * 存函数引用（不调用），由调用方决定何时执行，支持 Paraglide 等框架的静态分析。
 */
export async function generateRegistryMessages(
	endpoints: EndpointInfo[],
	apiDir: string,
	groupPattern: string,
	messagesConfig: MessagesConfig,
): Promise<boolean> {
	const resolvedDir = resolveRealPath(path.resolve(apiDir));
	const messagesPath = path.join(resolvedDir, REGISTRY_MESSAGES_FILE);

	const cfg = {
		from: messagesConfig.from ?? DEFAULT_MESSAGES_CONFIG.from,
		export: messagesConfig.export ?? DEFAULT_MESSAGES_CONFIG.export,
		returnType: messagesConfig.returnType ?? DEFAULT_MESSAGES_CONFIG.returnType,
		keyPrefix: messagesConfig.keyPrefix ?? DEFAULT_MESSAGES_CONFIG.keyPrefix,
	};

	// 收集所有唯一 group（稳定排序）
	const groups = Array.from(new Set(endpoints.map((ep) => extractGroup(ep.apiUrl, groupPattern)))).sort();

	const lines: string[] = [];
	lines.push(GENERATED_MARKER.trimEnd());
	lines.push(ESLINT_IGNORE_ALL.trimEnd());

	if (cfg.returnType !== 'string') {
		lines.push(`import { ${cfg.export}, type ${cfg.returnType} } from '${cfg.from}';`);
	} else {
		lines.push(`import { ${cfg.export} } from '${cfg.from}';`);
	}
	lines.push('');
	lines.push(`/** 分组标签映射，由插件自动生成，随 API 路由同步更新 */`);
	lines.push(`export const GROUP_LABELS: Record<string, () => ${cfg.returnType}> = {`);
	for (const group of groups) {
		lines.push(`  ${group}: ${cfg.export}['${cfg.keyPrefix}.${group}'],`);
	}
	lines.push('};');
	lines.push('');

	return await writeIfChanged(messagesPath, lines.join('\n'));
}
