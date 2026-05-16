import type { HttpMethod } from './config.js';
import type { StandardSchemaV1 } from '@standard-schema/spec';

/** API 路由中 `dMETHOD` 导出的元数据对象 */
export interface ApiMethodDef {
	/** 端点描述（用于 OpenAPI 和 MCP） */
	description?: string;
	/** MCP 专属配置 */
	mcp?: {
		/** 工具注释 */
		annotations?: Record<string, unknown>;
	};
}

export interface MethodInfo {
	method: HttpMethod;
	hasSchema: boolean;
	/** 通过 `dMETHOD` 导出的描述 */
	description?: string;
	/** 通过 `nMETHOD` 自定义的导出名 */
	customName?: string;
	/** 通过 `dMETHOD.mcp` 导出的 MCP 配置 */
	mcp?: {
		category?: string;
		extraData?: Record<string, unknown>;
	};
}

export interface EndpointInfo {
	filePath: string;
	/** 相对于 apiDir 的路由标识，如 v1_test */
	routePath: string;
	/** API URL 路径，如 /api/v1/test */
	apiUrl: string;
	methods: MethodInfo[];
}

/** 重新导出 StandardSchemaV1 供用户使用 */
export type { StandardSchemaV1 };
