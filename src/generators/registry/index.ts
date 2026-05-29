import path from 'node:path';
import {
	REGISTRY_FILE,
	REGISTRY_MESSAGES_FILE,
	API_GITIGNORE_ENTRY,
	LOG_PREFIX,
	GENERATED_MARKER2,
} from '../../config.js';
import type { GenerateConfig } from '../../config.js';
import { writeIfChanged } from '../../file-writer.js';
import { generateRegistry, generateRegistryMessages } from './openapi.js';
import type { EndpointInfo } from '../../types.js';

/**
 * 生成所有注册表文件。
 */
export async function generateRegistryFiles(
	endpoints: EndpointInfo[],
	apiDir: string,
	config: { groupPattern: string; generate: GenerateConfig },
) {
	const resolvedDir = path.resolve(apiDir);
	const generate = config.generate;

	if (generate.registry === false) {
		return;
	}

	const registryWritten = await generateRegistry(endpoints, apiDir, config.groupPattern);

	let messagesWritten = false;
	if (generate.messages) {
		messagesWritten = await generateRegistryMessages(endpoints, apiDir, config.groupPattern, generate.messages);
	}

	// 管理 apiDir/.gitignore
	const apiGitignorePath = path.join(resolvedDir, '.gitignore');
	await writeIfChanged(apiGitignorePath, GENERATED_MARKER2 + API_GITIGNORE_ENTRY);

	if (registryWritten) {
		console.log(`${LOG_PREFIX} 已生成注册表 ${path.relative(process.cwd(), path.join(resolvedDir, REGISTRY_FILE))}`);
	}
	if (messagesWritten) {
		console.log(
			`${LOG_PREFIX} 已生成注册表 ${path.relative(process.cwd(), path.join(resolvedDir, REGISTRY_MESSAGES_FILE))}`,
		);
	}
	if (!registryWritten && !messagesWritten) {
		console.log(`${LOG_PREFIX} 注册表无变化`);
	}
}
