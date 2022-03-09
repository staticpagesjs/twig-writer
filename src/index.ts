import * as fs from 'fs';
import * as path from 'path';
import { Script } from 'vm';
import importFrom from 'import-from';
import * as yaml from 'js-yaml';
import showdown from 'showdown';
import { TwingEnvironment, TwingFilter, TwingFunction, TwingLoaderFilesystem } from 'twing';
import { TwingCallable, TwingCallableWrapperOptions } from 'twing/dist/types/lib/callable-wrapper';
import { TwingFilterOptions } from 'twing/dist/types/lib/filter';

export * from 'twing';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isAsyncFunction = (fn: any): fn is { (...args: unknown[]): Promise<unknown> } => fn?.constructor?.name === 'AsyncFunction';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ensureAsyncFunction = (fn: any) => isAsyncFunction(fn) ? fn : (...args: Parameters<typeof fn>): Promise<ReturnType<typeof fn>> => Promise.resolve(fn(...args));

const addFunction = (
	env: TwingEnvironment,
	name: string,
	fn: TwingCallable<unknown>,
	opts?: TwingCallableWrapperOptions,
) => env.addFunction(new TwingFunction(name, ensureAsyncFunction(fn), [], opts));

const addFilter = (
	env: TwingEnvironment,
	name: string,
	fn: TwingCallable<unknown>,
	opts?: TwingFilterOptions,
) => env.addFilter(new TwingFilter(name, ensureAsyncFunction(fn), [], opts));

const isFunctionLike = /^\s*(?:async)?\s*(?:\([a-zA-Z0-9_, ]*\)\s*=>|[a-zA-Z0-9_,]+\s*=>|function\s*\*?\s*[a-zA-Z0-9_,]*\s*\([a-zA-Z0-9_,]*\)\s*{)/;
function tryParseFunction(value: string): string | { (data: Data): string } {
	if (isFunctionLike.test(value)) {
		return new Script(value).runInNewContext();
	}
	return value;
}

/**
 * Imports a CommonJS module, relative from the process.cwd().
 *
 * @param moduleName Module path.
 * @param exportName Preferred export, if not exists fallbacks to default, then a cjs function export.
 * @returns Module exports.
 */
const importModule = (moduleName: string, exportName = 'cli'): unknown => {
	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const module: any = importFrom(process.cwd(), moduleName);
		return module[exportName] ?? module.default ?? module;
	} catch (error: unknown) {
		throw new Error(`Failed to load module '${moduleName}': ${error instanceof Error ? error.message : error}\n${error instanceof Error ? 'Trace: ' + error.stack : 'No stack trace available.'}`);
	}
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function cli(options: any = {}) {
	const {
		view,
		outFile,
		globals,
		functions,
		filters,
		advanced,
		...rest
	} = options;
	const opts = { ...rest } as TwigWriterOptions;

	// VIEW prop
	if (typeof view === 'string') {
		opts.view = tryParseFunction(view);
	}

	// OUTFILE prop
	if (typeof outFile === 'string') {
		const parsedOutFile = tryParseFunction(outFile);
		if (typeof parsedOutFile === 'function') {
			opts.outFile = parsedOutFile;
		} else {
			throw new Error('Provided \'outFile\' option does evaluates to a function.');
		}
	}

	// GLOBALS prop
	if (typeof globals === 'string' && fs.existsSync(globals)) {
		opts.globals = yaml.load(fs.readFileSync(globals, 'utf-8')) as TwigWriterOptions['globals'];
	}

	// FUNCTIONS prop
	if (typeof functions === 'string') {
		const module = importModule(functions);
		if (typeof module === 'object' && module) {
			opts.functions = module as TwigWriterOptions['functions'];
		} else {
			throw new Error('Provided \'functions\' option does evaluates to an object.');
		}
	} else if (typeof functions === 'object' && functions) {
		if (typeof functions.module === 'string') {
			const exportName = typeof functions.export === 'string' ? functions.export : undefined;
			const module = importModule(functions.module, exportName);
			if (typeof module === 'object' && module) {
				opts.functions = module as TwigWriterOptions['functions'];
			} else {
				throw new Error('Provided \'functions.module\' option does evaluates to an object.');
			}
		} else {
			throw new Error('Provided \'functions.module\' option is invalid type, expected string.');
		}
	} else if (typeof functions !== 'undefined') {
		throw new Error('Provided \'functions\' option is invalid type, expected object or string.');
	}

	// FILTERS prop
	if (typeof filters === 'string') {
		const module = importModule(filters);
		if (typeof module === 'object' && module) {
			opts.filters = module as TwigWriterOptions['filters'];
		} else {
			throw new Error('Provided \'filters\' option does evaluates to an object.');
		}
	} else if (typeof filters === 'object' && filters) {
		if (typeof filters.module === 'string') {
			const exportName = typeof filters.export === 'string' ? filters.export : undefined;
			const module = importModule(filters.module, exportName);
			if (typeof module === 'object' && module) {
				opts.filters = module as TwigWriterOptions['filters'];
			} else {
				throw new Error('Provided \'filters.module\' option does evaluates to an object.');
			}
		} else {
			throw new Error('Provided \'filters.module\' option is invalid type, expected string.');
		}
	} else if (typeof filters !== 'undefined') {
		throw new Error('Provided \'filters\' option is invalid type, expected object or string.');
	}

	// ADVANCED prop
	if (typeof advanced === 'string') {
		const module = importModule(advanced);
		if (typeof module === 'function') {
			opts.advanced = module as TwigWriterOptions['advanced'];
		} else {
			throw new Error('Provided \'advanced\' option does evaluates to a function.');
		}
	} else if (typeof advanced === 'object' && advanced) {
		if (typeof advanced.module === 'string') {
			const exportName = typeof advanced.export === 'string' ? advanced.export : undefined;
			const module = importModule(advanced.module, exportName);
			if (typeof module === 'function') {
				opts.advanced = module as TwigWriterOptions['advanced'];
			} else {
				throw new Error('Provided \'advanced.module\' option does evaluates to a function.');
			}
		} else {
			throw new Error('Provided \'advanced.module\' option is invalid type, expected string.');
		}
	} else if (typeof advanced !== 'undefined') {
		throw new Error('Provided \'advanced\' option is invalid type, expected object or string.');
	}

	return twigWriter(opts);
}

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
		addFunction(env, k, f, o);
	}

	// Filters
	for (const [k, v] of Object.entries(filters)) {
		const [f, o] = Array.isArray(v) ? v : [v];
		addFilter(env, k, f, o);
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
