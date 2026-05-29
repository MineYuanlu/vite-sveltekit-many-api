import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSchemaNames } from './data.server';

export const GET: RequestHandler = () => {
	return json(getSchemaNames());
};
