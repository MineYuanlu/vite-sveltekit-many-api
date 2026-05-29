import { entries } from '../api/registry.server';
import { toJSONSchema } from 'zod';

const schemas = new Map<string, string | null>();
const schemaNames = new Set<string>();

entries.forEach((entry) => {
	const schema = entry.definition?.inputSchema ?? entry.schema;
	schemas.set(
		entry.operationId.toLowerCase(),
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		schema
			? JSON.stringify(toJSONSchema(schema as any, { reused: 'ref', unrepresentable: 'any', io: 'input' }), null, 2)
			: null,
	);
	if (schema) schemaNames.add(entry.operationId);
});

export function getSchema(name: string): string | undefined | null {
	return schemas.get(name.toLowerCase());
}

export function getSchemaNames(): string[] {
	return Array.from(schemaNames);
}
