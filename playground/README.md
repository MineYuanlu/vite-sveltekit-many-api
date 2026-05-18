# Playground

这是 `@yuanlu_yl/vite-sveltekit-many-api` 插件的最小化 SvelteKit 测试环境，用于快速验证和演示插件功能。

## 项目结构

```
playground/
├── src/
│   └── routes/
│       └── api/                    # API 路由目录
│           ├── hello-api.server.ts # 示例 API 端点
│           ├── openapi-registry.server.ts  # 生成的 OpenAPI 注册表
│           └── mcp-registry.server.ts      # 生成的 MCP 注册表
├── vite.config.ts                  # 已配置 apiRoutes() 插件
└── package.json
```

## 启动步骤

**必须先构建插件，再启动 playground**：

```bash
# 1. 在项目根目录构建插件（关键！）
cd ..
npm run build

# 2. 回到 playground 安装依赖（首次）
cd playground
npm install

# 3. 启动开发服务器
npm run dev
```

> 插件通过 `file:..` 链接引用，必须先构建生成 `dist/` 目录，playground 才能正常工作。

## 添加测试端点

在 `src/routes/api/` 下创建以 `-api.server.ts` 结尾的文件：

```typescript
// src/routes/api/test-api.server.ts
export async function GET() {
	return { message: 'Hello from playground!' };
}
```

保存后插件会自动生成：

- `+server.ts` — SvelteKit 服务端处理文件
- `api.remote.ts` — 远程函数包装器
- 更新 `openapi-registry.server.ts` 和 `mcp-registry.server.ts`

## 使用 Zod Schema

```typescript
// src/routes/api/users-api.server.ts
import { z } from 'zod';

export const zGET = z.object({
	id: z.string(),
});

export const dGET = {
	description: '根据 ID 获取用户信息',
};

export async function GET({ id }: { id: string }) {
	return { id, name: 'Test User' };
}
```

## 可用命令

```bash
npm run dev      # 启动开发服务器
npm run build    # 构建生产版本（触发插件扫描）
npm run preview  # 预览生产构建
npm run check    # 运行 svelte-check 类型检查
```

## 注意事项

- 所有 `// @generated` 标记的文件均由插件自动管理，请勿手动编辑
- 开发模式下插件会监听文件变更并自动重新生成
- 构建模式下插件会全量扫描并生成所有文件
