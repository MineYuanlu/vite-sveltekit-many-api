# @yuanlu_yl/vite-sveltekit-many-api

[English](README.en.md)

为 SvelteKit 自动从 `-api.server.ts` 文件生成 API 路由的 Vite 插件,支持 OpenAPI 和 MCP 注册表。

## 设计理念

本插件采用**双模式生成策略**,同时支持两种文件组织方式:

### 模式一:伴随式文件 (Per-endpoint)

每个 API 端点都会**伴随生成独立文件**,与原始 `-api.server.ts` 文件同目录:

- `+server.ts` — SvelteKit 服务端请求处理程序
- `api.remote.ts` — SvelteKit 远程函数包装器(用于 `$app/server` 的 `query`/`command`)

**特点**: 文件分散在各端点目录,修改某个端点时只需处理对应文件,定位清晰。

### 模式二:聚合式注册表 (Registry)

收集**所有端点信息汇总**到一个注册表文件中:

- `openapi-registry.server.ts` — OpenAPI 端点注册表
- `mcp-registry.server.ts` — MCP (Model Context Protocol) 工具注册表

**特点**: 单文件全局视角,便于统一管理、导出和外部集成。

### 可扩展性

当前已内置支持以上四种自动生成文件类型,但架构设计上**高度可扩展**。未来可轻松添加新的伴随式文件生成器或聚合式注册表生成器,只需在 `generators/` 目录中实现对应逻辑即可。

## 特性

- 🔥 自动生成 `+server.ts` SvelteKit 服务端处理文件
- 📡 自动生成 `api.remote.ts` SvelteKit 远程函数包装器
- 📋 自动生成 OpenAPI 注册表
- 🤖 自动生成 MCP 工具注册表
- 🔄 开发模式文件监听与热更新
- 🛡️ 安全生成(不会覆盖用户文件)

## 安装

```bash
npm install -D @yuanlu_yl/vite-sveltekit-many-api
```

## 用法

在 `vite.config.ts` 中添加插件:

```typescript
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { apiRoutes } from '@yuanlu_yl/vite-sveltekit-many-api';

export default defineConfig({
	plugins: [apiRoutes(), sveltekit()],
});
```

## API 文件约定

在 `src/routes/api/` 下创建以 `-api.server.ts` 结尾的文件:

```typescript
// src/routes/api/v1/test-api.server.ts
import { z } from 'zod';

export const zGET = z.object({
	id: z.string(),
});

export const dGET = {
	description: '获取测试数据',
	mcp: {
		category: 'test',
	},
};

export async function GET(params: { id: string }) {
	return { message: 'Hello', id: params.id };
}

export const zPOST = z.object({
	name: z.string(),
});

export async function POST(params: { name: string }) {
	return { created: true, name: params.name };
}
```

## 导出约定

| 导出前缀              | 说明              | 示例                                                     |
| --------------------- | ----------------- | -------------------------------------------------------- |
| `METHOD` (如 `GET`)   | HTTP 请求处理函数 | `export async function GET(params) {}`                   |
| `zMETHOD` (如 `zGET`) | Zod 参数校验模式  | `export const zGET = z.object({...})`                    |
| `nMETHOD` (如 `nGET`) | 自定义导出名      | `export const nGET = 'customName'`                       |
| `dMETHOD` (如 `dGET`) | 描述和 MCP 配置   | `export const dGET = { description: '...', mcp: {...} }` |

## 生成文件

插件会自动生成以下文件:

### 伴随式文件(与 `-api.server.ts` 同目录)

- `+server.ts` — SvelteKit 服务端处理程序
- `api.remote.ts` — SvelteKit 远程函数包装器

### 聚合式注册表(位于 `src/routes/api/` 根目录)

- `openapi-registry.server.ts` — OpenAPI 端点注册表
- `mcp-registry.server.ts` — MCP 工具注册表

> ⚠️ 生成的文件带有 `// @generated` 标记,请勿手动编辑,否则插件将不再管理该文件。

## 开发模式

在开发模式下,插件会监听 `src/routes/api/` 目录下所有 `-api.server.ts` 文件的变更:

- **文件新增/修改**: 自动重新生成对应的 `+server.ts` 和 `api.remote.ts`
- **文件删除**: 自动删除对应的生成文件
- **注册表更新**: 批量更新 OpenAPI 和 MCP 注册表(带 50ms 防抖)

## 构建模式

在构建时,插件会全量扫描并生成所有文件,确保部署时包含最新的 API 路由。

## CLI 模式

也可以通过命令行直接生成文件:

```bash
node -e "require('@yuanlu_yl/vite-sveltekit-many-api')" generate
```

## 依赖要求

- Node.js >= 18.0.0
- Vite ^5.0.0 || ^6.0.0
- SvelteKit

## 许可证

MIT
