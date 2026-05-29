import { ScalarApiReference } from '@scalar/sveltekit';
import type { RequestHandler } from './$types';

const render = ScalarApiReference({ url: '/openapi.json' });

export const GET: RequestHandler = () => render();
