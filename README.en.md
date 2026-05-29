# @yuanlu_yl/vite-sveltekit-many-api

[中文](README.md)

Vite plugin for SvelteKit to auto-generate API routes from `-api.server.ts` files.

## Design Philosophy

This plugin adopts a **dual-mode generation strategy**, supporting two file organization patterns simultaneously:

### Mode 1: Per-endpoint Companion Files

Each API endpoint generates **companion files** alongside the original `-api.server.ts` in the same directory:

- `+server.ts` — SvelteKit server request handlers
- `api.remote.ts` — SvelteKit remote function wrappers (for `$app/server`'s `query`/`command`)

**Characteristics**: Files are distributed across endpoint directories, making each endpoint self-contained and easy to locate.

### Mode 2: Aggregated Registry

**Collects information from all endpoints** into registry files:

- `registry.server.ts` — Unified endpoint registry (handler, schema, definition, group, etc.)
- `registry.messages.ts` — Group label mapping for i18n (optional, requires `generate.messages`)

**Characteristics**: Single-file global view, convenient for unified management, export, and external integration (OpenAPI, MCP, etc.).

### Extensibility

The architecture is **highly extensible** — new companion file generators or aggregated registry generators can be easily added in the future by implementing corresponding logic in the `generators/` directory.

## Features

- Auto-generate `+server.ts` SvelteKit server handler files
- Auto-generate `api.remote.ts` SvelteKit remote function wrappers
- Auto-generate `registry.server.ts` unified endpoint registry
- Optionally generate `registry.messages.ts` i18n group label mapping (for Paraglide, etc.)
- File watching with hot reload in development mode (companion files update immediately, registry debounced at 50ms)
- Safe generation (won't overwrite user files)
- Standard Schema support (Zod, Valibot, or any `StandardSchemaV1`-compatible library)

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

## Full Configuration Options

```typescript
apiRoutes({
	util: {
		// Template copy detection path (auto-copies helper template on first use)
		path: 'src/lib/api/common.server.ts',
		// Import path used in generated +server.ts files
		imp: '$lib/api/common.server',
		// Schema mode: 'standard' (default, any StandardSchemaV1-compatible lib) or 'zod'
		schema: 'standard',
	},
	generate: {
		server: true, // generate +server.ts
		remote: true, // generate api.remote.ts
		registry: true, // generate registry.server.ts
		// i18n group label file; false or omitted means disabled
		messages: false,
		// or enable:
		// messages: {
		//   from: '$lib/paraglide/messages', // message module import path
		//   export: 'm',                     // imported object name
		//   returnType: 'string',            // return type of message functions
		//   keyPrefix: 'group',              // prefix; actual key is '{keyPrefix}.{groupName}'
		// },
	},
	// API routes root directory (default: 'src/routes/api')
	apiDir: 'src/routes/api',
	// Regex string to extract group from API URL (default: '/api/v[^/]+/([^/]+)')
	groupPattern: '/api/v[^/]+/([^/]+)',
});
```

## API File Convention

Create files ending with `-api.server.ts` in `src/routes/api/` (recommended as directory form so `+server.ts` stays alongside):

```typescript
// src/routes/api/v1/items/-api.server.ts
import type { ApiMethodDef } from '@yuanlu_yl/vite-sveltekit-many-api';
import z from 'zod';

export const zGET = z.object({
	id: z.string().optional(),
});

export const nGET = 'listItems';

export const dGET: ApiMethodDef = {
	description: 'List all items, or get one by id',
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
	description: 'Create a new item',
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

## Export Conventions

| Export Prefix            | Description                                                          | Example                                                                      |
| ------------------------ | -------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `METHOD` (e.g., `GET`)   | HTTP request handler                                                 | `export async function GET(params) {}`                                       |
| `zMETHOD` (e.g., `zGET`) | Parameter validation schema (any `StandardSchemaV1`-compatible)      | `export const zGET = z.object({...})`                                        |
| `nMETHOD` (e.g., `nGET`) | Custom export name (used for remote function name and `operationId`) | `export const nGET = 'listItems'`                                            |
| `dMETHOD` (e.g., `dGET`) | Description, inputSchema override and MCP config                     | `export const dGET: ApiMethodDef = { description: '...', inputSchema: ... }` |

## Generated Files

The plugin will automatically generate the following files:

### Companion Files (in same directory as `-api.server.ts`)

- `+server.ts` — SvelteKit server handlers
- `api.remote.ts` — SvelteKit remote function wrappers

### Aggregated Registries (located at `apiDir` root)

- `registry.server.ts` — Unified endpoint registry
- `registry.messages.ts` — Group label mapping (requires `generate.messages` config)

> ⚠️ Generated files carry a `// @generated` marker. Do not edit them manually, or the plugin will stop managing that file.

## Development Mode

In development mode, the plugin watches for changes to all `-api.server.ts` files in `apiDir`:

- **File add/modify**: Immediately regenerates corresponding `+server.ts` and `api.remote.ts`
- **File delete**: Automatically removes corresponding generated files
- **Registry update**: Batch updates registry files (with 50ms debounce)

## Build Mode

During build, the plugin performs a full scan and generates all files, ensuring the deployment includes the latest API routes.

## CLI Mode

You can also generate files directly via command line (auto-reads `apiRoutes` config from `vite.config.ts`):

```bash
node -e "require('@yuanlu_yl/vite-sveltekit-many-api')" generate

# Or specify a config file path
node -e "require('@yuanlu_yl/vite-sveltekit-many-api')" generate --config vite.config.ts
```

## Playground

The project includes a `playground/` directory at the root — a minimal SvelteKit test environment.

```bash
# 1. Build the plugin at project root
npm run build

# 2. Install playground dependencies (first time only)
cd playground && npm install

# 3. Start the playground dev server
npm run dev
```

## Requirements

- Node.js >= 18.0.0
- Vite ^5.0.0 || ^6.0.0
- SvelteKit

## License

MIT
