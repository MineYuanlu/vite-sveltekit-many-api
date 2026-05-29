# @yuanlu_yl/vite-sveltekit-many-api

[English](README.en.md)

为 SvelteKit 自动从 `-api.server.ts` 文件生成 API 路由的 Vite 插件。

## 设计理念

本插件采用**双模式生成策略**，同时支持两种文件组织方式:

### 模式一：伴随式文件 (Per-endpoint)

每个 API 端点都会**伴随生成独立文件**，与原始 `-api.server.ts` 文件同目录:

- `+server.ts` — SvelteKit 服务端请求处理程序
- `api.remote.ts` — SvelteKit 远程函数包装器（用于 `$app/server` 的 `query`/`command`）

**特点**: 文件分散在各端点目录，修改某个端点时只需处理对应文件，定位清晰。

### 模式二：聚合式注册表 (Registry)

收集**所有端点信息汇总**到注册表文件中:

- `registry.server.ts` — 统一端点注册表（包含 handler、schema、definition、group 等）
- `registry.messages.ts` — 分组标签映射（可选，需配置 `generate.messages`）

**特点**: 单文件全局视角，便于统一管理、导出和外部集成（OpenAPI、MCP 等）。

### 可扩展性

架构设计上**高度可扩展**——未来可轻松添加新的伴随式文件生成器或聚合式注册表生成器，只需在 `generators/` 目录中实现对应逻辑即可。

## 特性

- 自动生成 `+server.ts` SvelteKit 服务端处理文件
- 自动生成 `api.remote.ts` SvelteKit 远程函数包装器
- 自动生成 `registry.server.ts` 统一端点注册表
- 可选生成 `registry.messages.ts` i18n 分组标签映射（Paraglide 等框架）
- 开发模式文件监听与热更新（伴随文件立即更新，注册表 50ms 防抖）
- 安全生成（不会覆盖用户文件）
- 支持 Standard Schema（Zod、Valibot 等均可）

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

## 完整配置选项

```typescript
apiRoutes({
	util: {
		// 模板文件复制检测路径（首次使用时自动复制辅助函数模板）
		path: 'src/lib/api/common.server.ts',
		// 生成的 +server.ts 中的导入路径
		imp: '$lib/api/common.server',
		// schema 模式：'standard'（默认，适用于任意 StandardSchemaV1 兼容库）或 'zod'
		schema: 'standard',
	},
	generate: {
		server: true, // 是否生成 +server.ts
		remote: true, // 是否生成 api.remote.ts
		registry: true, // 是否生成 registry.server.ts
		// i18n 分组标签文件；false 或省略表示不生成
		messages: false,
		// 或启用：
		// messages: {
		//   from: '$lib/paraglide/messages', // 消息模块导入路径
		//   export: 'm',                     // 导入的消息对象名
		//   returnType: 'string',            // 消息函数返回类型
		//   keyPrefix: 'group',              // 键前缀，实际键为 '{keyPrefix}.{groupName}'
		// },
	},
	// API 路由根目录（默认 'src/routes/api'）
	apiDir: 'src/routes/api',
	// 从 API URL 提取分组的正则字符串（默认 '/api/v[^/]+/([^/]+)'）
	groupPattern: '/api/v[^/]+/([^/]+)',
});
```

## API 文件约定

在 `src/routes/api/` 下创建以 `-api.server.ts` 结尾的文件（推荐用目录形式，便于同目录放 `+server.ts`）:

```typescript
// src/routes/api/v1/items/-api.server.ts
import type { ApiMethodDef } from '@yuanlu_yl/vite-sveltekit-many-api';
import z from 'zod';

export const zGET = z.object({
	id: z.string().optional(),
});

export const nGET = 'listItems';

export const dGET: ApiMethodDef = {
	description: '列出所有条目，或按 id 获取单个条目',
	mcp: {
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
};

export async function GET({ id }: z.infer<typeof zGET>) {
	return { items: [], id };
}

export const zPOST = z.object({
	name: z.string(),
	value: z.number().default(0),
});

export const nPOST = 'createItem';

export const dPOST: ApiMethodDef = {
	description: '创建新条目',
	mcp: {
		annotations: {
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: false,
		},
	},
};

export async function POST(body: z.infer<typeof zPOST>) {
	return { created: true, ...body };
}
```

## 导出约定

| 导出前缀              | 说明                                           | 示例                                                                         |
| --------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------- |
| `METHOD` (如 `GET`)   | HTTP 请求处理函数                              | `export async function GET(params) {}`                                       |
| `zMETHOD` (如 `zGET`) | 参数校验 Schema（任意 StandardSchemaV1 兼容）  | `export const zGET = z.object({...})`                                        |
| `nMETHOD` (如 `nGET`) | 自定义导出名（用于 remote 函数和 operationId） | `export const nGET = 'listItems'`                                            |
| `dMETHOD` (如 `dGET`) | 描述、inputSchema 覆盖和 MCP 配置              | `export const dGET: ApiMethodDef = { description: '...', inputSchema: ... }` |

## 生成文件

插件会自动生成以下文件:

### 伴随式文件（与 `-api.server.ts` 同目录）

- `+server.ts` — SvelteKit 服务端处理程序
- `api.remote.ts` — SvelteKit 远程函数包装器

### 聚合式注册表（位于 `apiDir` 根目录）

- `registry.server.ts` — 统一端点注册表
- `registry.messages.ts` — 分组标签映射（需 `generate.messages` 配置）

> ⚠️ 生成的文件带有 `// @generated` 标记，请勿手动编辑，否则插件将不再管理该文件。

## 开发模式

在开发模式下，插件会监听 `apiDir` 目录下所有 `-api.server.ts` 文件的变更:

- **文件新增/修改**: 立即重新生成对应的 `+server.ts` 和 `api.remote.ts`
- **文件删除**: 自动删除对应的生成文件
- **注册表更新**: 批量更新注册表（50ms 防抖）

## 构建模式

在构建时，插件会全量扫描并生成所有文件，确保部署时包含最新的 API 路由。

## CLI 模式

也可以通过命令行直接生成文件（会自动读取 `vite.config.ts` 中的 `apiRoutes` 配置）:

```bash
node -e "require('@yuanlu_yl/vite-sveltekit-many-api')" generate

# 或指定配置文件路径
node -e "require('@yuanlu_yl/vite-sveltekit-many-api')" generate --config vite.config.ts
```

## Playground

项目根目录下包含一个 `playground/` 目录，是一个最小化的 SvelteKit 测试环境。

```bash
# 1. 先在项目根目录构建插件
npm run build

# 2. 进入 playground 安装依赖（首次）
cd playground && npm install

# 3. 启动 playground 开发服务器
npm run dev
```

## 依赖要求

- Node.js >= 18.0.0
- Vite ^5.0.0 || ^6.0.0
- SvelteKit

## 许可证

MIT
