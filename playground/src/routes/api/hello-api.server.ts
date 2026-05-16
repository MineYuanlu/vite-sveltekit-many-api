import type { RequestHandler } from '@sveltejs/kit';

// Simple GET handler
export const GET: RequestHandler = async ({ url }) => {
	const name = url.searchParams.get('name') || 'world';
	return new Response(JSON.stringify({ message: `Hello, ${name}!` }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	});
};
