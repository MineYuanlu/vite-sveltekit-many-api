import type { ApiMethodDef } from '@yuanlu_yl/vite-sveltekit-many-api';
import z from 'zod';

export const zGET = z.object({
	name: z.string().default('World'),
});

export const nGET = 'greet';

export const dGET: ApiMethodDef = {
	description: 'Return a greeting message for the given name',
	mcp: {
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
};

export function GET({ name }: z.infer<typeof zGET>) {
	return {
		greeting: `Hello, ${name}!`,
	};
}
