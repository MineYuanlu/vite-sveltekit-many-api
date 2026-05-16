// @ts-nocheck
import { error, json } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';
import z from 'zod';

export function success({ message = 'OK', data }: Partial<{ ok: true; message: string; data: unknown }>, init?: ResponseInit) {
	return json({ ok: true, message, data }, init);
}

/**
 * 执行断言, 如果 expr 为 falsey, 则抛出 HttpError 错误
 */
export function assert(expr: unknown, message: string, status = 500): asserts expr {
	if (!expr) {
		const err = new Error(message);
		throw error(status, {
			message,
		});
	}
}

function merge(user: unknown, intern: unknown) {
	if (intern === undefined) return user;
	assert(typeof user === 'object' && user !== null, 'Bad Request', 400);
	assert(typeof intern === 'object' && intern !== null, 'Internal Server Error');
	return { ...user, ...intern };
}

/**
 * 按照 zod schema 解析请求体
 */
export async function parseBody<Schema extends z.ZodType>(
	schema: Schema,
	extra?: Partial<z.input<Schema>>,
): Promise<z.output<Schema>> {
	const raw = merge(await getRequestEvent().request.json(), extra);
	const result = await schema.safeParseAsync(raw);
	if (!result.success) {
		throw error(400, { message: result.error.message });
	}
	return result.data;
}

/**
 * 按照 zod schema 解析请求参数
 */
export async function parseSearchParams<Schema extends z.ZodType>(
	schema: Schema,
	extra?: Partial<z.input<Schema>>,
): Promise<z.output<Schema>> {
	const raw = merge(Object.fromEntries(getRequestEvent().url.searchParams), extra);
	const result = await schema.safeParseAsync(raw);
	if (!result.success) {
		throw error(400, { message: result.error.message });
	}
	return result.data;
}
