import type { HttpMethod } from './config.js';
import type { StandardSchemaV1 } from '@standard-schema/spec';

/** API 路由中 `dMETHOD` 导出的元数据对象 */
export interface ApiMethodDef {
	/** 端点描述（用于 OpenAPI 和 MCP） */
	description?: string;
	/** MCP 专属配置 */
	mcp?: {
		/** 工具注释 */
		annotations?: {
			title?: string | undefined;
			/** 工具是否会修改环境状态 */
			readOnlyHint?: boolean | undefined;
			/** 如果会修改，这种修改是否是破坏性的（而非添加性的） */
			destructiveHint?: boolean | undefined;
			/** 使用相同参数多次调用是否安全（幂等性） */
			idempotentHint?: boolean | undefined;
			/** 工具是否会与外部实体（如互联网）交互 */
			openWorldHint?: boolean | undefined;
		};
	};
}

export interface MethodInfo {
	method: HttpMethod;
	hasSchema: boolean;
	/** 是否存在 `dMETHOD` 导出（运行时通过 import 获取元数据） */
	hasDefinition: boolean;
	/** 通过 `nMETHOD` 自定义的导出名 */
	customName?: string;
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
