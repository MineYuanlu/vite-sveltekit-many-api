import type { ApiEntry } from '@yuanlu_yl/vite-sveltekit-many-api';
import { toJSONSchema } from 'zod';

const STANDARD_RESPONSE_SCHEMA = {
	type: 'object',
	properties: {
		ok: { type: 'boolean', const: true },
		message: { type: 'string' },
		data: { type: 'object' },
	},
	required: ['ok', 'message'],
} as const;

function buildQueryParameters(jsonSchema: Record<string, unknown>): Record<string, unknown>[] {
	const properties = (jsonSchema.properties as Record<string, Record<string, unknown>>) ?? {};
	const requiredFields: string[] = (jsonSchema.required as string[]) ?? [];
	const parameters: Record<string, unknown>[] = [];

	for (const [name, prop] of Object.entries(properties)) {
		const { description, ...schema } = prop;
		const param: Record<string, unknown> = { name, in: 'query', required: requiredFields.includes(name), schema };
		if (description) param.description = description;
		parameters.push(param);
	}

	return parameters;
}

function buildOperation(entry: ApiEntry): Record<string, unknown> {
	const operation: Record<string, unknown> = {
		operationId: entry.operationId,
		tags: [entry.group],
		responses: {
			'200': {
				description: 'Success',
				content: { 'application/json': { schema: STANDARD_RESPONSE_SCHEMA } },
			},
		},
	};

	if (entry.description) operation.description = entry.description;

	const effectiveSchema = entry.definition?.inputSchema ?? entry.schema;
	if (effectiveSchema) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const jsonSchema = toJSONSchema(effectiveSchema as any, { reused: 'ref', unrepresentable: 'any', io: 'input' });

		if (entry.usesBody) {
			operation.requestBody = {
				required: true,
				content: { 'application/json': { schema: jsonSchema } },
			};
		} else {
			const parameters = buildQueryParameters(jsonSchema as Record<string, unknown>);
			if (parameters.length > 0) operation.parameters = parameters;
		}
	}

	return operation;
}

export function buildOpenAPISpec(entries: ApiEntry[]): object {
	const paths: Record<string, Record<string, unknown>> = {};
	const tagSet = new Set<string>();

	for (const entry of entries) {
		const method = entry.method.toLowerCase();
		tagSet.add(entry.group);
		if (!paths[entry.path]) paths[entry.path] = {};
		paths[entry.path][method] = buildOperation(entry);
	}

	return {
		openapi: '3.1.0',
		info: { title: 'Playground API', version: '0.0.1' },
		servers: [{ url: '/' }],
		paths,
		tags: Array.from(tagSet).map((name) => ({ name })),
	};
}
