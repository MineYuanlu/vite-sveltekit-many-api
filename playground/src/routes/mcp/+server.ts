import { McpServer, WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/server';
import type { RequestHandler } from './$types';
import { entries } from '../api/registry.server';
import { registerTools } from './tool.server';

const transport = (async () => {
	const server = new McpServer({
		name: 'playground-mcp',
		version: '0.0.1',
		description: 'vite-sveltekit-many-api playground MCP server',
	});

	registerTools(server, entries);

	const t = new WebStandardStreamableHTTPServerTransport({});
	await server.connect(t);
	return t;
})();

const requestHandler: RequestHandler = async (event) => {
	return (await transport).handleRequest(event.request);
};

export const GET: RequestHandler = requestHandler;
export const POST: RequestHandler = requestHandler;
export const DELETE: RequestHandler = requestHandler;
