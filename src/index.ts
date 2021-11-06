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

export type TwigFunction = TwingCallable<unknown> | {
	fn: TwingCallable<unknown>,
	options?: TwingCallableWrapperOptions,
};

export type TwigFilter = TwingCallable<unknown> | {
	fn: TwingCallable<unknown>,
	options?: TwingFilterOptions,
};

export interface TwigWriterOptions {
	view?: string | { (data: Data): string };
	viewsDir?: string;
	outFile?: { (data: Data): string };
	outDir?: string;

	// advanced
	globals?: Record<string, unknown>;
	functions?: Record<string, TwigFunction>;
	filters?: Record<string, TwigFilter>;
	advanced?: { (env: TwingEnvironment): void } | { async (env: TwingEnvironment): Promise<void> };
	showdownOptions?: showdown.ConverterOptions;
	markdownFilter?: boolean
}

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
 * @param file Module path.
 * @param preferredImport Preferred import, if not exists fallbacks to default, then a cjs function export.
 * @returns Module exports.
 */
const importModule = (file: string, preferredImport = 'cli'): unknown => {
	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const mod: any = importFrom(process.cwd(), file);
		if (mod[preferredImport]) return mod[preferredImport];
		if (mod.default) return mod.default;
		return mod;
	} catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
		throw new Error(`Failed to load module '${file}': ${error.message || error}\n${error.stack ? 'Trace: ' + error.stack : 'No stack trace available.'}`);
	}
};



// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function cli(options: any) {
	const { view, outFile, globals, functions, filters, advanced, ...rest } = options;
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
	if (globals && fs.existsSync(globals)) {
		opts.globals = yaml.load(fs.readFileSync(globals, 'utf-8')) as TwigWriterOptions['globals'];
	}

	// FUNCTIONS prop
	if (typeof functions === 'string') {
		const mod = importModule(functions);
		if (typeof mod === 'object' && mod) {
			opts.functions = mod as TwigWriterOptions['functions'];
		} else {
			throw new Error('Provided \'functions\' option does evaluates to an object.');
		}
	} else if (typeof functions === 'object' && functions) {
		if (typeof functions.module === 'string') {
			const importName = typeof functions.import === 'string' ? functions.import : undefined;
			const mod = importModule(functions.module, importName);
			if (typeof mod === 'object' && mod) {
				opts.functions = mod as TwigWriterOptions['functions'];
			} else {
				throw new Error('Provided \'functions.module\' option does evaluates to an object.');
			}
		} else {
			throw new Error('Provided \'functions.module\' option is invalid type, expected string.');
		}
	} else {
		throw new Error('Provided \'functions\' option is invalid type, expected object or string.');
	}

	// FILTERS prop
	if (typeof filters === 'string') {
		const mod = importModule(filters);
		if (typeof mod === 'object' && mod) {
			opts.filters = mod as TwigWriterOptions['filters'];
		} else {
			throw new Error('Provided \'filters\' option does evaluates to an object.');
		}
	} else if (typeof filters === 'object' && filters) {
		if (typeof filters.module === 'string') {
			const importName = typeof filters.import === 'string' ? filters.import : undefined;
			const mod = importModule(filters.module, importName);
			if (typeof mod === 'object' && mod) {
				opts.filters = mod as TwigWriterOptions['filters'];
			} else {
				throw new Error('Provided \'filters.module\' option does evaluates to an object.');
			}
		} else {
			throw new Error('Provided \'filters.module\' option is invalid type, expected string.');
		}
	} else {
		throw new Error('Provided \'filters\' option is invalid type, expected object or string.');
	}

	// ADVANCED prop
	if (typeof advanced === 'string') {
		const mod = importModule(advanced);
		if (typeof mod === 'function') {
			opts.advanced = mod as TwigWriterOptions['advanced'];
		} else {
			throw new Error('Provided \'advanced\' option does evaluates to a function.');
		}
	} else if (typeof advanced === 'object' && advanced) {
		if (typeof advanced.module === 'string') {
			const importName = typeof advanced.import === 'string' ? advanced.import : undefined;
			const mod = importModule(advanced.module, importName);
			if (typeof mod === 'function') {
				opts.advanced = mod as TwigWriterOptions['advanced'];
			} else {
				throw new Error('Provided \'advanced.module\' option does evaluates to a function.');
			}
		} else {
			throw new Error('Provided \'advanced.module\' option is invalid type, expected string.');
		}
	} else {
		throw new Error('Provided \'advanced\' option is invalid type, expected object or string.');
	}

	return twigWriter(opts);
}

export default async function twigWriter(options: TwigWriterOptions = {}) {
	let unnamedCounter = 1;
	const {
		view = 'main.twig',
		viewsDir = 'views',
		outDir = 'build',
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		outFile = (d: any) => d.output?.path || (d.output?.url || d.headers?.path?.replace(new RegExp(path.extname(d.headers.path) + '$'), '') || `unnamed-${unnamedCounter++}`) + '.html',
		globals = {},
		functions = {},
		filters = {},
		advanced = () => undefined,
		markdownFilter = true,
		showdownOptions = {},
	} = options;

	if (typeof view !== 'string' && typeof view !== 'function')
		throw new Error('Provided \'view\' option is not a string or a function.');

	if (typeof viewsDir !== 'string')
		throw new Error('Provided \'viewsDir\' option is not a string.');

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

	// Globals
	for (const [k, v] of Object.entries(globals)) {
		env.addGlobal(k, v);
	}

	// Functions
	for (const [k, v] of Object.entries(functions)) {
		const fn = typeof v === 'object' ? v.fn : v;
		const opts = typeof v === 'object' ? v.options : undefined;
		env.addFunction(new TwingFunction(k, fn, [], opts));
	}

	// Filters
	for (const [k, v] of Object.entries(filters)) {
		const fn = typeof v === 'object' ? v.fn : v;
		const opts = typeof v === 'object' ? v.options : undefined;
		env.addFilter(new TwingFilter(k, fn, [], opts));
	}

	// Advanced configuration if nothing helps.
	await advanced(env);

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

	return async function (data: Data): Promise<void> {
		const result = await env.render(typeof view === 'function' ? view(data) : view, data);
		const outputPath = path.resolve(outDir, outFile(data));
		fs.mkdirSync(path.dirname(outputPath), { recursive: true });
		fs.writeFileSync(outputPath, result);
	};
}
