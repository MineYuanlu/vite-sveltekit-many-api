import type { ApiMethodDef } from '@yuanlu_yl/vite-sveltekit-many-api';
import z from 'zod';

export const nGET = 'hello';

export const dGET: ApiMethodDef = {
	description: 'hello world',
	mcp: {
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
};

export const zGET = z.object({
	world: z.string().default('world'),
});

export function GET({ world }: z.infer<typeof zGET>) {
	return {
		hi: `hello ${world}!`,
	};
}
