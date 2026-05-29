import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSchema } from '../data.server';

export const GET: RequestHandler = ({ params: { name } }) => {
	const schema = getSchema(name);
	if (schema === undefined) error(404, `Schema not found: ${name}`);
	if (schema === null) error(404, `No schema for: ${name}`);

	return new Response(schema, { headers: { 'content-type': 'application/json' } });
};
