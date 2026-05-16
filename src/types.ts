import type { HttpMethod } from './config';

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
