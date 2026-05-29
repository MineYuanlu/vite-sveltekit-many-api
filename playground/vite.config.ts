import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { apiRoutes } from '@yuanlu_yl/vite-sveltekit-many-api';

export default defineConfig({
	plugins: [
		apiRoutes({
			util: {
				// Using Zod for validation helpers in this playground
				schema: 'zod',
			},
			// generate: {
			//   server: true,
			//   remote: true,
			//   registry: true,
			//   messages: {
			//     from: '$lib/paraglide/messages',
			//     export: 'm',
			//     keyPrefix: 'group',
			//   },
			// },
			// apiDir: 'src/routes/api',
			// groupPattern: '/api/v[^/]+/([^/]+)',
		}),
		sveltekit(),
	],
});
