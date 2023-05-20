import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import pkg from './package.json';

const baseConfig = {
	input: './src/index.js',
	plugins: [
		nodeResolve(),
		commonjs({
			include: 'node_modules/**', // Workaround for: https://github.com/rollup/rollup-plugin-commonjs/issues/247
		}),
		babel({
			comments: false,
			runtimeHelpers: true,
			presets: ['@babel/preset-env', '@babel/preset-react'],
		}),
	],
	external: [...Object.keys(pkg.dependencies), ...Object.keys(pkg.peerDependencies)],
};

export default [
	Object.assign(
		{
			output: {
				file: pkg.main,
				format: 'cjs',
			},
		},
		baseConfig,
	),
	Object.assign(
		{
			output: {
				file: 'es/index.js',
				format: 'esm',
			},
		},
		baseConfig,
	),
];
