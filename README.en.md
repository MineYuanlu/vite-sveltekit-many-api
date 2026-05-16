# @yuanlu_yl/vite-sveltekit-many-api

[中文](README.md)

Vite plugin for SvelteKit to auto-generate API routes from `-api.server.ts` files with OpenAPI and MCP registry support.

## Design Philosophy

This plugin adopts a **dual-mode generation strategy**, supporting two file organization patterns simultaneously:

### Mode 1: Per-endpoint Companion Files

Each API endpoint generates **companion files** alongside the original `-api.server.ts` in the same directory:

- `+server.ts` — SvelteKit server request handlers
- `api.remote.ts` — SvelteKit remote function wrappers (for `$app/server`'s `query`/`command`)

**Characteristics**: Files are distributed across endpoint directories. When modifying an endpoint, only the corresponding files need to be processed, making it easy to locate.

### Mode 2: Aggregated Registry

**Collects information from all endpoints** into a single registry file:

- `openapi-registry.server.ts` — OpenAPI endpoint registry
- `mcp-registry.server.ts` — MCP (Model Context Protocol) tool registry

**Characteristics**: Single-file global perspective, convenient for unified management, export, and external integration.

### Extensibility

Currently supports the above four auto-generated file types out of the box, but the architecture is **highly extensible**. New companion file generators or aggregated registry generators can be easily added in the future by implementing corresponding logic in the `generators/` directory.

## Features

- 🔥 Auto-generate `+server.ts` SvelteKit server handler files
- 📡 Auto-generate `api.remote.ts` SvelteKit remote function wrappers
- 📋 Auto-generate OpenAPI registry
- 🤖 Auto-generate MCP tool registry
- 🔄 File watching with hot reload in development mode
- 🛡️ Safe generation (won't overwrite user files)

## Playground

The project includes a `playground/` directory at the root, which is a minimal SvelteKit test environment for quickly validating plugin functionality.

### Setup Steps

Since the plugin itself needs to be built before it can be used by the playground, **you must build the plugin first, then build/start the playground**:

```bash
# 1. Build the plugin at project root
npm run build

# 2. Install playground dependencies (first time only)
cd playground
npm install

# 3. Start the playground dev server
npm run dev
```

### Playground Structure

```
playground/
├── src/routes/api/           # API routes directory
│   ├── hello-api.server.ts   # Example API endpoint
│   ├── openapi-registry.server.ts   # Generated OpenAPI registry
│   └── mcp-registry.server.ts       # Generated MCP registry
└── vite.config.ts            # Pre-configured with apiRoutes() plugin
```

### Adding Test Endpoints

Create files ending with `-api.server.ts` in `playground/src/routes/api/` to trigger auto-generation. For example:

```typescript
// playground/src/routes/api/test-api.server.ts
export async function GET() {
	return { message: 'Hello from playground!' };
}
```

After saving, the plugin will automatically generate the corresponding `+server.ts` and registry files.

---

## Installation

```bash
npm install -D @yuanlu_yl/vite-sveltekit-many-api
```

## Usage

Add the plugin to your `vite.config.ts`:

```typescript
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { apiRoutes } from '@yuanlu_yl/vite-sveltekit-many-api';

export default defineConfig({
	plugins: [apiRoutes(), sveltekit()],
});
```

## API File Convention

Create files ending with `-api.server.ts` in `src/routes/api/`:

```typescript
// src/routes/api/v1/test-api.server.ts
import { z } from 'zod';

export const zGET = z.object({
	id: z.string(),
});

export const dGET = {
	description: 'Get test data',
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

## Export Conventions

| Export Prefix            | Description                     | Example                                                  |
| ------------------------ | ------------------------------- | -------------------------------------------------------- |
| `METHOD` (e.g., `GET`)   | HTTP request handler            | `export async function GET(params) {}`                   |
| `zMETHOD` (e.g., `zGET`) | Zod parameter validation schema | `export const zGET = z.object({...})`                    |
| `nMETHOD` (e.g., `nGET`) | Custom export name              | `export const nGET = 'customName'`                       |
| `dMETHOD` (e.g., `dGET`) | Description and MCP config      | `export const dGET = { description: '...', mcp: {...} }` |

## Generated Files

The plugin will automatically generate the following files:

### Companion Files (in same directory as `-api.server.ts`)

- `+server.ts` — SvelteKit server handlers
- `api.remote.ts` — SvelteKit remote function wrappers

### Aggregated Registries (located at `src/routes/api/` root)

- `openapi-registry.server.ts` — OpenAPI endpoint registry
- `mcp-registry.server.ts` — MCP tool registry

> ⚠️ Generated files carry a `// @generated` marker. Do not edit them manually, or the plugin will stop managing that file.

## Development Mode

In development mode, the plugin watches for changes to all `-api.server.ts` files in `src/routes/api/`:

- **File add/modify**: Automatically regenerates corresponding `+server.ts` and `api.remote.ts`
- **File delete**: Automatically removes corresponding generated files
- **Registry update**: Batch updates OpenAPI and MCP registries (with 50ms debounce)

## Build Mode

During build, the plugin performs a full scan and generates all files, ensuring the deployment includes the latest API routes.

## CLI Mode

You can also generate files directly via command line:

```bash
node -e "require('@yuanlu_yl/vite-sveltekit-many-api')" generate
```

## Requirements

- Node.js >= 18.0.0
- Vite ^5.0.0 || ^6.0.0
- SvelteKit

## License

MIT
