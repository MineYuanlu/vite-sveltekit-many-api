import path from 'node:path';
import {
	API_ROUTES_DIR,
	OPENAPI_REGISTRY_FILE,
	MCP_REGISTRY_FILE,
	API_GITIGNORE_ENTRY,
	LOG_PREFIX,
} from '../../config.js';
import { writeIfChanged } from '../../file-writer.js';
import { generateOpenApiRegistry } from './openapi.js';
import { generateMcpRegistry } from './mcp.js';
import type { EndpointInfo } from '../../types.js';

/**
 * 生成所有注册表文件（OpenAPI、MCP 等）。
 */
export async function generateRegistryFiles(endpoints: EndpointInfo[]) {
	const apiDir = path.resolve(API_ROUTES_DIR);

	// 生成 OpenAPI 注册表
	const openApiWritten = await generateOpenApiRegistry(endpoints);

	// 生成 MCP 注册表
	const mcpWritten = await generateMcpRegistry(endpoints);

	// 管理 src/routes/api/.gitignore
	const apiGitignorePath = path.join(apiDir, '.gitignore');
	await writeIfChanged(apiGitignorePath, API_GITIGNORE_ENTRY);

	if (openApiWritten) {
		console.log(`${LOG_PREFIX} 已生成注册表 ${path.relative(process.cwd(), path.join(apiDir, OPENAPI_REGISTRY_FILE))}`);
	}
	if (mcpWritten) {
		console.log(`${LOG_PREFIX} 已生成注册表 ${path.relative(process.cwd(), path.join(apiDir, MCP_REGISTRY_FILE))}`);
	}
	if (!openApiWritten && !mcpWritten) {
		console.log(`${LOG_PREFIX} 注册表无变化`);
	}
}
