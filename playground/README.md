# Playground

`@yuanlu_yl/vite-sveltekit-many-api` 插件的最小化 SvelteKit 测试环境，用于快速验证和演示插件功能。

## 项目结构

```
playground/
├── src/
│   ├── lib/api/common.server.ts   # 请求解析辅助函数（由插件模板复制）
│   └── routes/
│       └── api/                  # API 路由目录（apiDir）
│           ├── hello/            # GET /api/hello — 带 schema、自定义名、MCP 注解
│           ├── world/            # GET /api/world — 带默认参数的问候接口
│           ├── v1/items/         # CRUD /api/v1/items — 演示 GET/POST/PUT/DELETE
│           └── registry.server.ts  # 生成的统一注册表（自动管理）
├── vite.config.ts                # 已配置 apiRoutes() 插件
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

## 示例端点

| 路由            | 方法                      | 说明                                 |
| --------------- | ------------------------- | ------------------------------------ |
| `/api/hello`    | GET                       | 带 Zod schema、自定义名 `hello`      |
| `/api/world`    | GET                       | 带默认参数的问候语，自定义名 `greet` |
| `/api/v1/items` | GET / POST / PUT / DELETE | 完整 CRUD，演示 registry 分组提取    |

## 添加测试端点

在 `src/routes/api/` 下创建目录并添加 `-api.server.ts` 文件：

```typescript
// src/routes/api/v1/notes/-api.server.ts
import type { ApiMethodDef } from '@yuanlu_yl/vite-sveltekit-many-api';
import z from 'zod';

export const zGET = z.object({ id: z.string() });

export const nGET = 'getNote';

export const dGET: ApiMethodDef = {
	description: 'Get a note by id',
	mcp: { annotations: { readOnlyHint: true } },
};

export function GET({ id }: z.infer<typeof zGET>) {
	return { id, content: 'Hello!' };
}
```

保存后插件会自动生成：

- `+server.ts` — SvelteKit 服务端处理文件
- `api.remote.ts` — 远程函数包装器
- 更新 `registry.server.ts`

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
- `apiDir` 根目录下的 `.gitignore` 也由插件管理，注册表文件会被自动 gitignore
