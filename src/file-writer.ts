import fs from 'node:fs';
import path from 'node:path';
import { GENERATED_MARKER, LOG_PREFIX } from './config.js';

/**
 * 如果内容有变化则写入文件。
 * @returns 是否实际发生了写入
 */
export async function writeIfChanged(filePath: string, content: string): Promise<boolean> {
	try {
		if (fs.existsSync(filePath)) {
			const existing = await fs.promises.readFile(filePath, 'utf-8');
			if (existing === content) return false;
		}
		await fs.promises.writeFile(filePath, content, 'utf-8');
		return true;
	} catch (err) {
		console.error(`${LOG_PREFIX} 写入失败 ${filePath}:`, err);
		return false;
	}
}

/**
 * 删除指定路径的生成文件（仅当文件以 GENERATED_MARKER 开头时）。
 */
export async function removeGeneratedFile(filePath: string) {
	if (!fs.existsSync(filePath)) return;
	try {
		const content = await fs.promises.readFile(filePath, 'utf-8');
		if (content.startsWith(GENERATED_MARKER)) {
			await fs.promises.unlink(filePath);
			console.log(`${LOG_PREFIX} 已删除生成文件 ${path.relative(process.cwd(), filePath)}`);
		}
	} catch (err) {
		console.error(`${LOG_PREFIX} 删除文件失败 ${filePath}:`, err);
	}
}
