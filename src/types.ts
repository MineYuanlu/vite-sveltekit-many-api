import type { HttpMethod } from './config.js';
import type { StandardSchemaV1 } from '@standard-schema/spec';

/** API 路由中 `dMETHOD` 导出的元数据对象 */
export interface ApiMethodDef {
	/** 端点描述（用于 OpenAPI 和 MCP） */
	description?: string;
	/**
	 * 覆盖 OpenAPI / JSON schema route 使用的 input schema。
	 * 优先级高于 zMETHOD。
	 */
	inputSchema?: StandardSchemaV1;
	/** MCP 专属配置 */
	mcp?: {
		/** 工具分类 */
		category?: string;
		/** 额外数据，供 MCP 工具注册时自由扩展 */
		extraData?: Record<string, unknown>;
		/**
		 * 覆盖 MCP 工具注册时使用的 input schema，优先级高于 ApiMethodDef.inputSchema。
		 * 用于向Agent提供一个简单的类型描述，不用于强校验。
		 */
		inputSchema?: StandardSchemaV1;
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

/** 解析 `-api.server.ts` 后得到的单个 HTTP 方法信息 */
export interface MethodInfo {
	/** HTTP 方法名，如 GET、POST */
	method: HttpMethod;
	/** 是否存在对应的 zMETHOD Schema 导出 */
	hasSchema: boolean;
	/** 是否存在 `dMETHOD` 导出（运行时通过 import 获取元数据） */
	hasDefinition: boolean;
	/** 通过 `nMETHOD` 自定义的导出名 */
	customName?: string;
}

/** 单个 API 端点的完整信息（对应一个 `-api.server.ts` 文件） */
export interface EndpointInfo {
	/** 源文件的绝对路径 */
	filePath: string;
	/** 相对于 apiDir 的路由标识，如 v1_test */
	routePath: string;
	/** API URL 路径，如 /api/v1/test */
	apiUrl: string;
	/** 该端点支持的所有 HTTP 方法 */
	methods: MethodInfo[];
}

/** 重新导出 StandardSchemaV1 供用户使用 */
export type { StandardSchemaV1 };
