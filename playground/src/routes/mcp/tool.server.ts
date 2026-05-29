import { McpServer, type CallToolResult } from '@modelcontextprotocol/server';
import type { ApiEntry } from '@yuanlu_yl/vite-sveltekit-many-api';
import z from 'zod';

const emptySchema = z.looseObject({});

function isObjectSchema(schema: unknown): schema is z.ZodObject {
	if (!schema || typeof schema !== 'object') return false;

	const def = (schema as Record<string, unknown>)._def;
	if (!def || typeof def !== 'object') return false;

	const type = (def as Record<string, unknown>).type;
	if (type === 'object') return true;
	if (type === 'effects') {
		const innerSchema = (def as Record<string, unknown>).schema;
		if (innerSchema) return isObjectSchema(innerSchema);
		return false;
	}
	if (type === 'pipe') {
		const innerIn = (def as Record<string, unknown>).in;
		const innerOut = (def as Record<string, unknown>).out;
		if (innerIn && innerOut) return isObjectSchema(innerIn) || isObjectSchema(innerOut);
		return false;
	}
	if (type === 'union' || type === 'discriminatedUnion') return true;

	return false;
}

function ensureObjectSchema(schema: z.ZodType | undefined): z.ZodObject {
	if (!schema) return emptySchema;
	if (isObjectSchema(schema)) return schema;
	return z.looseObject({ value: schema });
}

function cvtError(err: unknown): CallToolResult {
	if (err instanceof Error) {
		return {
			isError: true,
			content: [{ type: 'text', text: `${err.name} ${err.message}${err.stack ? ':\n' + err.stack : ''}` }],
		};
	}
	return {
		isError: true,
		content: [{ type: 'text', text: `Unknown error: ${typeof err === 'object' ? JSON.stringify(err) : err}` }],
	};
}

export function registerTools(server: McpServer, entries: ApiEntry[]) {
	for (const entry of entries) {
		const effectiveInputSchema = entry.definition?.mcp?.inputSchema ?? entry.definition?.inputSchema ?? entry.schema;
		const isPrimitiveSchema = effectiveInputSchema && !isObjectSchema(effectiveInputSchema);

		server.registerTool(
			entry.operationId,
			{
				description: entry.definition?.description ?? `${entry.method} ${entry.path}`,
				inputSchema: ensureObjectSchema(effectiveInputSchema as z.ZodType | undefined),
				annotations: entry.definition?.mcp?.annotations,
			},
			async (args) => {
				try {
					const actualArgs = isPrimitiveSchema ? (args as Record<string, unknown>)?.value : args;
					if (entry.handler) {
						const data = await entry.handler(actualArgs);
						return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
					}
					throw new Error(`No handler for ${entry.method} ${entry.path}`);
				} catch (err) {
					return cvtError(err);
				}
			},
		);
	}
}
