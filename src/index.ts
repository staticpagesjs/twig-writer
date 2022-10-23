import { marked } from 'marked';
import { TwingEnvironment, TwingLoaderFilesystem, TwingFilter, TwingFunction } from 'twing';
import { TwingCallable, TwingCallableWrapperOptions } from 'twing/dist/types/lib/callable-wrapper';
import { TwingFilterOptions } from 'twing/dist/types/lib/filter';
import { fileWriter, FileWriterOptions } from '@static-pages/file-writer';

export * as twing from 'twing';
export { marked };

export type TwigWriterOptions = {
	view?: string | { (data: Record<string, unknown>): string };
	viewsDir?: string | string[];

	// advanced
	globals?: Record<string, unknown>;
	functions?: Record<string, TwingCallable<unknown> | [
		TwingCallable<unknown>,
		TwingCallableWrapperOptions,
	]>;
	filters?: Record<string, TwingCallable<unknown> | [
		TwingCallable<unknown>,
		TwingFilterOptions,
	]>;
	advanced?: { (env: TwingEnvironment): void };
	markedEnabled?: boolean;
	markedOptions?: marked.MarkedOptions;
} & Omit<FileWriterOptions, 'renderer'>;

const isAsyncFunction = (fn: { (...args: unknown[]): unknown }): fn is { (...args: unknown[]): Promise<unknown> } => (
	fn?.constructor?.name === 'AsyncFunction'
);
const ensureAsyncFunction = (fn: { (...args: unknown[]): unknown }): { (...args: unknown[]): Promise<unknown> } => (
	isAsyncFunction(fn)
		? fn
		: (...args: unknown[]) => Promise.resolve(fn(...args))
);

export const twigWriter = ({
	view = 'main.twig',
	viewsDir = 'views',
	globals = {},
	functions = {},
	filters = {},
	advanced = () => undefined,
	markedEnabled = true,
	markedOptions = {},
	...rest
}: TwigWriterOptions = {}) => {
	if (typeof view !== 'string' && typeof view !== 'function')
		throw new Error('twig-writer \'view\' option expects a string or a function.');

	if (typeof viewsDir !== 'string' && !(Array.isArray(viewsDir) && viewsDir.every(x => typeof x === 'string')))
		throw new Error('twig-writer \'viewsDir\' option expects a string or string[].');

	if (typeof globals !== 'object' || !globals)
		throw new Error('twig-writer \'globals\' option expects an object.');

	if (typeof functions !== 'object' || !functions)
		throw new Error('twig-writer \'functions\' option expects an object.');

	if (typeof filters !== 'object' || !filters)
		throw new Error('twig-writer \'filters\' option expects an object.');

	if (typeof advanced !== 'function')
		throw new Error('twig-writer \'advanced\' option expects a function.');

	if (typeof markedOptions !== 'object' || !markedOptions)
		throw new Error('twig-writer \'markedOptions\' option expects an object.');

	// Create Twig env
	const env = new TwingEnvironment(new TwingLoaderFilesystem(viewsDir));

	// Provide a built-in markdown filter
	if (markedEnabled) {
		env.addFilter(new TwingFilter('markdown',
			async (md, runtimeOptions) => {
				if (runtimeOptions) {
					const runtimeOptionsObj = Object.fromEntries(runtimeOptions.entries());
					return (runtimeOptionsObj?.inline ? marked.parseInline : marked)(md, { ...markedOptions, ...runtimeOptionsObj});
				}
				return marked(md, markedOptions);
			},
			[],
			{ is_safe: ['html'] }
		));
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
