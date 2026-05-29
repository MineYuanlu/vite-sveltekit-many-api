import type { ApiMethodDef } from '@yuanlu_yl/vite-sveltekit-many-api';
import z from 'zod';

// In-memory store for demo purposes
const store = new Map<string, { id: string; name: string; value: number }>();

// ── GET ──────────────────────────────────────────────────────────────────────

export const zGET = z.object({
	id: z.string().optional(),
});

export const nGET = 'listItems';

export const dGET: ApiMethodDef = {
	description: 'List all items or fetch a single item by id',
	mcp: {
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
};

export function GET({ id }: z.infer<typeof zGET>) {
	if (id) return { item: store.get(id) ?? null };
	return { items: Array.from(store.values()) };
}

// ── POST ─────────────────────────────────────────────────────────────────────

export const zPOST = z.object({
	id: z.string(),
	name: z.string(),
	value: z.coerce.number().default(0),
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

export function POST(body: z.infer<typeof zPOST>) {
	store.set(body.id, body);
	return { created: true, item: body };
}

// ── PUT ──────────────────────────────────────────────────────────────────────

export const zPUT = z.object({
	id: z.string(),
	name: z.string().optional(),
	value: z.coerce.number().optional(),
});

export const nPUT = 'updateItem';

export const dPUT: ApiMethodDef = {
	description: 'Update an existing item by id',
	mcp: {
		annotations: {
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
};

export function PUT({ id, ...updates }: z.infer<typeof zPUT>) {
	const existing = store.get(id);
	if (!existing) return { updated: false };
	const updated = { ...existing, ...updates };
	store.set(id, updated);
	return { updated: true, item: updated };
}

// ── DELETE ───────────────────────────────────────────────────────────────────

export const zDELETE = z.object({
	id: z.string(),
});

export const nDELETE = 'deleteItem';

export const dDELETE: ApiMethodDef = {
	description: 'Delete an item by id',
	mcp: {
		annotations: {
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
};

export function DELETE({ id }: z.infer<typeof zDELETE>) {
	const existed = store.delete(id);
	return { deleted: existed, id };
}
