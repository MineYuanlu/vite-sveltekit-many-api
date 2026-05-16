import { error, json } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';
import type { StandardSchemaV1 } from '@standard-schema/spec';

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

function formatIssues(issues: ReadonlyArray<StandardSchemaV1.Issue>): string {
	return issues.map((issue) => {
		const path = issue.path?.map((p) => (typeof p === 'object' ? p.key : p)).join('.') ?? 'root';
		return `${path}: ${issue.message}`;
	}).join(', ');
}

/**
 * 按照 Standard Schema 解析请求体
 */
export async function parseBody<Schema extends StandardSchemaV1>(
	schema: Schema,
	extra?: Partial<StandardSchemaV1.InferInput<Schema>>,
): Promise<StandardSchemaV1.InferOutput<Schema>> {
	const raw = merge(await getRequestEvent().request.json(), extra);
	const result = await schema['~standard'].validate(raw);
	if (result.issues) {
		throw error(400, { message: formatIssues(result.issues) });
	}
	return result.value;
}

/**
 * 按照 Standard Schema 解析请求参数
 */
export async function parseSearchParams<Schema extends StandardSchemaV1>(
	schema: Schema,
	extra?: Partial<StandardSchemaV1.InferInput<Schema>>,
): Promise<StandardSchemaV1.InferOutput<Schema>> {
	const raw = merge(Object.fromEntries(getRequestEvent().url.searchParams), extra);
	const result = await schema['~standard'].validate(raw);
	if (result.issues) {
		throw error(400, { message: formatIssues(result.issues) });
	}
	return result.value;
}
