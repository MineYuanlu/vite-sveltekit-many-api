import fs from 'node:fs';
import path from 'node:path';
import { GENERATED_MARKER, LOG_PREFIX, GITIGNORE_FILE, SERVER_FILE, REMOTE_FILE, type UtilConfig, GENERATED_MARKER2 } from './config.js';

/**
 * 如果内容有变化则写入文件。
 * @returns 是否实际发生了写入
 */
export async function writeIfChanged(filePath: string, content: string): Promise<boolean> {
	try {
		let existing: string | undefined;
		try {
			existing = await fs.promises.readFile(filePath, 'utf-8');
		} catch (e) {
			if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
		}
		if (existing === content) return false;

		const dir = path.dirname(filePath);
		await fs.promises.mkdir(dir, { recursive: true });
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

/** 获取端点目录 .gitignore 的应有内容 */
function getEndpointGitignoreContent(dir: string): string {
	const entries: string[] = [];
	if (fs.existsSync(path.join(dir, SERVER_FILE))) entries.push(`/${SERVER_FILE}\n`);
	if (fs.existsSync(path.join(dir, REMOTE_FILE))) entries.push(`/${REMOTE_FILE}\n`);
	if (entries.length > 0) {
		entries.unshift(GENERATED_MARKER2);
	}
	return entries.join('');
}

/**
 * 同步端点目录的 .gitignore：
 * - 如果目录下有自动生成的文件，确保 .gitignore 包含它们
 * - 如果没有，删除 .gitignore（如果由我们创建过，即文件头有 GENERATED_MARKER）
 */
export async function syncEndpointGitignore(dir: string): Promise<void> {
	const gitignorePath = path.join(dir, GITIGNORE_FILE);
	const expectedContent = getEndpointGitignoreContent(dir);

	if (expectedContent === '') {
		// 没有生成文件了，清理 .gitignore（仅当文件头有 GENERATED_MARKER 时）
		if (fs.existsSync(gitignorePath)) {
			try {
				const existing = await fs.promises.readFile(gitignorePath, 'utf-8');
				if (existing.startsWith(GENERATED_MARKER2)) {
					await fs.promises.unlink(gitignorePath);
					console.log(`${LOG_PREFIX} 已删除端点 .gitignore ${path.relative(process.cwd(), gitignorePath)}`);
				}
			} catch {
				// 忽略读取失败
			}
		}
	} else {
		// 有生成文件，确保 .gitignore 存在且内容正确
		await writeIfChanged(gitignorePath, expectedContent);
	}
}

/**
 * 确保 common.server.ts 模板文件存在于用户项目中。
 * 如果 path 为 null/undefined，则跳过。
 * 如果目标文件已存在，不会覆盖。
 */
export async function ensureUtilTemplate(util: UtilConfig): Promise<void> {
	if (!util.path) return;

	const targetPath = path.resolve(util.path);
	if (fs.existsSync(targetPath)) return;

	// 根据 schema 配置选择模板
	const templateName = util.schema === 'zod' ? 'common-zod.server.ts' : 'common-standard.server.ts';

	// 查找模板文件：通过模块解析找到当前包的根目录
	let pkgRoot: string | undefined;
	try {
		// 使用 require.resolve 找到本包的入口文件，再向上找到包根目录
		const entryPath = require.resolve('@yuanlu_yl/vite-sveltekit-many-api');
		pkgRoot = path.resolve(path.dirname(entryPath), '..');
	} catch {
		// 如果 require.resolve 失败（比如 ESM 模式下），fallback 到基于当前文件位置的查找
		// 通过全局属性检测 CJS/ESM 模式，避免编译期直接引用 import.meta（CJS 打包时会报 WARN）
		const globalDir = (globalThis as unknown as { __dirname?: string }).__dirname;
		if (globalDir) {
			pkgRoot = path.resolve(globalDir, '..');
		} else {
			// ESM 模式：通过 import.meta.url 定位
			const metaUrl = (globalThis as unknown as { import?: { meta?: { url?: string } } }).import?.meta?.url;
			if (metaUrl) {
				pkgRoot = path.resolve(path.dirname(new URL(metaUrl).pathname), '..');
			}
		}
	}

	const searchDirs: string[] = [];
	if (pkgRoot) {
		searchDirs.push(path.resolve(pkgRoot, 'dist', 'templates'));
		searchDirs.push(path.resolve(pkgRoot, 'templates'));
	}
	// fallback：尝试从当前工作目录向上查找（适用于 monorepo 等场景）
	searchDirs.push(path.resolve(process.cwd(), 'templates'));
	searchDirs.push(path.resolve(process.cwd(), 'dist', 'templates'));
	searchDirs.push(path.resolve(process.cwd(), '..', 'templates'));

	let templatePath: string | undefined;
	for (const dir of searchDirs) {
		const candidate = path.join(dir, templateName);
		if (fs.existsSync(candidate)) {
			templatePath = candidate;
			break;
		}
	}

	if (!templatePath) {
		console.warn(`${LOG_PREFIX} 模板文件不存在，搜索路径: ${searchDirs.join(', ')}`);
		return;
	}

	try {
		const content = await fs.promises.readFile(templatePath, 'utf-8');
		const targetDir = path.dirname(targetPath);
		await fs.promises.mkdir(targetDir, { recursive: true });
		await fs.promises.writeFile(targetPath, content, 'utf-8');
		console.log(`${LOG_PREFIX} 已创建 util 模板: ${path.relative(process.cwd(), targetPath)}`);
	} catch (err) {
		console.error(`${LOG_PREFIX} 复制 util 模板失败:`, err);
	}
}
