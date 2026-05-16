import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { apiRoutes } from '@yuanlu_yl/vite-sveltekit-many-api';

export default defineConfig({
	plugins: [
		apiRoutes({
			util: {
				schema: 'zod',
			},
		}),
		sveltekit(),
	],
});
