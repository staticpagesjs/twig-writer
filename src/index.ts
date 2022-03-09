import * as fs from 'fs';
import * as path from 'path';
import showdown from 'showdown';
import { TwingEnvironment, TwingLoaderFilesystem, TwingFilter, TwingFunction } from 'twing';
import { TwingCallable, TwingCallableWrapperOptions } from 'twing/dist/types/lib/callable-wrapper';
import { TwingFilterOptions } from 'twing/dist/types/lib/filter';

export * from 'twing';
export { cli } from './cli.js';

type Data = Record<string, unknown>;

type TwigFunction = TwingCallable<unknown> | [
	TwingCallable<unknown>,
	TwingCallableWrapperOptions,
];

type TwigFilter = TwingCallable<unknown> | [
	TwingCallable<unknown>,
	TwingFilterOptions,
];

export interface TwigWriterOptions {
	view?: string | { (data: Data): string };
	viewsDir?: string | string[];
	outFile?: { (data: Data): string };
	outDir?: string;

	// advanced
	globals?: Record<string, unknown>;
	functions?: Record<string, TwigFunction>;
	filters?: Record<string, TwigFilter>;
	advanced?: { (env: TwingEnvironment): void };
	showdownOptions?: showdown.ConverterOptions;
	markdownFilter?: boolean
}

const isAsyncFunction = (fn: { (...args: unknown[]): unknown }): fn is { (...args: unknown[]): Promise<unknown> } => (
	fn?.constructor?.name === 'AsyncFunction'
);
const ensureAsyncFunction = (fn: { (...args: unknown[]): unknown }): { (...args: unknown[]): Promise<unknown> } => (
	isAsyncFunction(fn)
		? fn
		: (...args: unknown[]) => Promise.resolve(fn(...args))
);

export default function twigWriter(options: TwigWriterOptions = {}) {
	let unnamedCounter = 1;
	const {
		view = 'main.twig',
		viewsDir = 'views',
		outDir = 'build',
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		outFile = (d: any) => d.output?.path || (d.output?.url || d.header?.path?.replace(new RegExp(path.extname(d.header.path) + '$'), '') || `unnamed-${unnamedCounter++}`) + '.html',
		globals = {},
		functions = {},
		filters = {},
		advanced = () => undefined,
		markdownFilter = true,
		showdownOptions = {},
	} = options;

	if (typeof view !== 'string' && typeof view !== 'function')
		throw new Error('Provided \'view\' option is not a string or a function.');

	if (typeof viewsDir !== 'string' && !(Array.isArray(viewsDir) && viewsDir.every(x => typeof x === 'string')))
		throw new Error('Provided \'viewsDir\' option is not a string or string[].');

	if (typeof outFile !== 'function')
		throw new Error('Provided \'outFile\' option is not a function.');

	if (typeof outDir !== 'string')
		throw new Error('Provided \'outDir\' option is not a string.');

	if (typeof globals !== 'object' || !globals)
		throw new Error('Provided \'globals\' option is not an object.');

	if (typeof functions !== 'object' || !functions)
		throw new Error('Provided \'functions\' option is not an object.');

	if (typeof filters !== 'object' || !filters)
		throw new Error('Provided \'filters\' option is not an object.');

	if (typeof advanced !== 'function')
		throw new Error('Provided \'advanced\' option is not a function.');

	if (typeof showdownOptions !== 'object' || !showdownOptions)
		throw new Error('Provided \'showdownOptions\' option is not an object.');

	// Create Twig env
	const env = new TwingEnvironment(new TwingLoaderFilesystem(viewsDir));

	// Provide a built-in markdown filter
	if (markdownFilter) {
		const converter = new showdown.Converter({
			ghCompatibleHeaderId: true,
			customizedHeaderId: true,
			tables: true,
			...showdownOptions
		});
		env.addFilter(new TwingFilter('markdown', async md => converter.makeHtml(md), [], { is_safe: ['html'] }));
	}

	// Globals
	for (const [k, v] of Object.entries(globals)) {
		env.addGlobal(k, v);
	}

	// Functions
	for (const [k, v] of Object.entries(functions)) {
		const [f, o] = Array.isArray(v) ? v : [v];
		env.addFunction(new TwingFunction(k, ensureAsyncFunction(f), [], o));
	}

	// Filters
	for (const [k, v] of Object.entries(filters)) {
		const [f, o] = Array.isArray(v) ? v : [v];
		env.addFilter(new TwingFilter(k, ensureAsyncFunction(f), [], o));
	}

	// Advanced configuration if nothing helps.
	advanced(env);

	return async function (data: Data): Promise<void> {
		const result = await env.render(typeof view === 'function' ? view(data) : view, data);
		const outputPath = path.resolve(outDir, outFile(data));
		fs.mkdirSync(path.dirname(outputPath), { recursive: true });
		fs.writeFileSync(outputPath, result);
	};
}
