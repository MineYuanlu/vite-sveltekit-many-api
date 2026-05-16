import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export function createTempDir(): string {
	return fs.mkdtempSync(path.join(os.tmpdir(), 'vite-sveltekit-many-api-'));
}

export function cleanupTempDir(dir: string): void {
	fs.rmSync(dir, { recursive: true, force: true });
}

export function writeApiFile(dir: string, content: string, filename = '-api.server.ts'): string {
	const filePath = path.join(dir, filename);
	fs.writeFileSync(filePath, content, 'utf-8');
	return filePath;
}

export function readFile(filePath: string): string {
	return fs.readFileSync(filePath, 'utf-8');
}

export function removeFile(filePath: string): void {
	fs.rmSync(filePath, { force: true });
}

export function removeDir(dir: string): void {
	fs.rmSync(dir, { recursive: true, force: true });
}
