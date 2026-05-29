import type { RequestHandler } from './$types';
import { entries } from '../api/registry.server';
import { buildOpenAPISpec } from './openapi';

export const GET: RequestHandler = () => {
	const spec = buildOpenAPISpec(entries);
	return new Response(JSON.stringify(spec, null, 2), {
		headers: { 'Content-Type': 'application/json' },
	});
};
