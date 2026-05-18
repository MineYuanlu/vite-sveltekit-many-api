import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{
		ignores: ['dist/**', 'node_modules/**', 'coverage/**', '**/*.config.{ts,mjs,cjs,js}'],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
		},
		linterOptions: {
			reportUnusedDisableDirectives: true,
		},
		rules: {
			// 优先使用单引号（与 Prettier 保持一致）
			quotes: ['warn', 'single'],
			// 允许 any 类型（库代码需要灵活性）
			'@typescript-eslint/no-explicit-any': 'off',
			// 允许使用 require（CJS 兼容场景）
			'@typescript-eslint/no-require-imports': 'off',
			// 禁用 no-var（CJS 兼容场景）
			'no-var': 'off',
		},
	},
);
