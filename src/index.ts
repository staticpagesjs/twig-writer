import showdown from 'showdown';
import { TwingEnvironment, TwingLoaderFilesystem, TwingFilter, TwingFunction } from 'twing';
import { TwingCallable, TwingCallableWrapperOptions } from 'twing/dist/types/lib/callable-wrapper';
import { TwingFilterOptions } from 'twing/dist/types/lib/filter';
import { fileWriter, FileWriterOptions } from '@static-pages/file-writer';

export * from 'twing';
export { cli } from './cli.js';

type TwigFunction = TwingCallable<unknown> | [
	TwingCallable<unknown>,
	TwingCallableWrapperOptions,
];

type TwigFilter = TwingCallable<unknown> | [
	TwingCallable<unknown>,
	TwingFilterOptions,
];

export type TwigWriterOptions = {
	view?: string | { (data: Record<string, unknown>): string };
	viewsDir?: string | string[];

	// advanced
	globals?: Record<string, unknown>;
	functions?: Record<string, TwigFunction>;
	filters?: Record<string, TwigFilter>;
	advanced?: { (env: TwingEnvironment): void };
	showdownEnabled?: boolean;
	showdownOptions?: showdown.ConverterOptions;
} & Pick<FileWriterOptions, 'outDir' | 'outFile'>;

const isAsyncFunction = (fn: { (...args: unknown[]): unknown }): fn is { (...args: unknown[]): Promise<unknown> } => (
	fn?.constructor?.name === 'AsyncFunction'
);
const ensureAsyncFunction = (fn: { (...args: unknown[]): unknown }): { (...args: unknown[]): Promise<unknown> } => (
	isAsyncFunction(fn)
		? fn
		: (...args: unknown[]) => Promise.resolve(fn(...args))
);

export const twigWriter = (options: TwigWriterOptions = {}) => {
	const {
		view = 'main.twig',
		viewsDir = 'views',
		globals = {},
		functions = {},
		filters = {},
		advanced = () => undefined,
		showdownEnabled = true,
		showdownOptions = {},
		...rest
	} = options;

	if (typeof view !== 'string' && typeof view !== 'function')
		throw new Error('Provided \'view\' option is not a string or a function.');

	if (typeof viewsDir !== 'string' && !(Array.isArray(viewsDir) && viewsDir.every(x => typeof x === 'string')))
		throw new Error('Provided \'viewsDir\' option is not a string or string[].');

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
	if (showdownEnabled) {
		const converter = new showdown.Converter({
			ghCompatibleHeaderId: true,
			customizedHeaderId: true,
			tables: true,
			...showdownOptions,
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

	const writer = fileWriter({
		...rest,
		renderer: data => env.render(typeof view === 'function' ? view(data) : view, data),
	});

	return (data: Record<string, unknown>): Promise<void> => writer(data);
};

export default twigWriter;
