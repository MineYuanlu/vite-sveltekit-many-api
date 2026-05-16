const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..', 'templates');
const destDir = path.resolve(__dirname, '..', 'dist', 'templates');

if (!fs.existsSync(srcDir)) {
	console.error('Templates directory not found:', srcDir);
	process.exit(1);
}

if (!fs.existsSync(destDir)) {
	fs.mkdirSync(destDir, { recursive: true });
}

const files = fs.readdirSync(srcDir);
for (const file of files) {
	const srcPath = path.join(srcDir, file);
	const destPath = path.join(destDir, file);

	const stat = fs.statSync(srcPath);
	if (stat.isDirectory()) {
		// 递归复制子目录（目前 templates 下没有子目录，但预留支持）
		fs.cpSync(srcPath, destPath, { recursive: true });
		continue;
	}

	let content = fs.readFileSync(srcPath, 'utf-8');

	// 删除顶部的 // @ts-nocheck 注释，不要复制到用户代码中
	const lines = content.split('\n');
	if (lines[0]?.trim() === '// @ts-nocheck') {
		lines.shift();
		// 删除可能紧跟的空行
		while (lines.length > 0 && lines[0]?.trim() === '') {
			lines.shift();
		}
		content = lines.join('\n');
	}

	fs.writeFileSync(destPath, content, 'utf-8');
	console.log(`Copied: ${file}`);
}
