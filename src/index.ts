import * as fs from 'fs';
import * as path from 'path';
import { Script } from 'vm';
import * as yaml from 'js-yaml';
import { Data } from '@static-pages/core';
import { TwingEnvironment, TwingFilter, TwingFunction, TwingLoaderFilesystem } from 'twing';
import { TwingCallable } from 'twing/dist/types/lib/callable-wrapper';

export interface Options {
	view?: string | { (data: Data): string };
	viewsDir?: string;
	outFile?: { (data: Data): string };
	outDir?: string;
	globals?: Record<string, unknown>;
	filters?: Record<string, { (...a: unknown[]): unknown; }>;
	functions?: Record<string, { (...a: unknown[]): unknown; }>;
}

const isFunctionLike = /^\s*(?:async)?\s*(?:\([a-zA-Z0-9_, ]*\)\s*=>|[a-zA-Z0-9_,]+\s*=>|function\s*\*?\s*[a-zA-Z0-9_,]*\s*\([a-zA-Z0-9_,]*\)\s*{)/;

function tryParseFunction(value: string): string | { (data: Data): string } {
	if (isFunctionLike.test(value)) {
		return new Script(value).runInNewContext();
	}
	return value;
}

export function cli(options: any) {
	const { view, url, globals, ...rest } = options;
	const opts = { ...rest } as Options;

	if (typeof view === 'string') {
		opts.view = tryParseFunction(view);
	}

	if (typeof url === 'string') {
		const parsedUrl = tryParseFunction(url);
		if (typeof parsedUrl === 'function') {
			opts.outFile = parsedUrl;
		} else {
			throw new Error('Provided \'url\' option does evaluates to a function.');
		}
	}

	// TODO: load functions & filters

	if (globals && fs.existsSync(globals)) {
		opts.globals = yaml.load(fs.readFileSync(globals, 'utf-8')) as Options['globals'];
	}

	return twigWriter(opts);
}

export default function twigWriter(options: Partial<Options> = {}) {
	let unnamedCounter = 1;
	const {
		view = 'index.twig',
		viewsDir = 'views',
		outDir = 'build',
		outFile = (d: any) => (d.output?.url || d.headers?.url || `unnamed-${unnamedCounter++}`) + '.html',
		globals = {},
		functions = {},
		filters = {},
	} = options;

	if (typeof view !== 'string' && typeof view !== 'function')
		throw new Error('Provided \'view\' option is not a string or a function.');

	if (typeof viewsDir !== 'string')
		throw new Error('Provided \'viewsDir\' option is not a string.');

	if (typeof outFile !== 'function')
		throw new Error('Provided \'url\' option is not a function.');

	if (typeof outDir !== 'string')
		throw new Error('Provided \'outDir\' option is not a string.');

	if (typeof globals !== 'object' || !globals)
		throw new Error('Provided \'globals\' option is not an object.');

	// Create Twig env
	const env = new TwingEnvironment(new TwingLoaderFilesystem(viewsDir));

	// Globals
	for (const [k, v] of Object.entries(globals)) {
		env.addGlobal(k, v);
	}

	// Functions
	for (const [k, v] of Object.entries(functions)) {
		// TODO: add is_raw: html
		env.addFunction(new TwingFunction(k.replace(/\$$/, ''), v as TwingCallable<any>, []));
	}

	// Filters
	for (const [k, v] of Object.entries(filters)) {
		// TODO: add is_raw: html
		env.addFilter(new TwingFilter(k.replace(/\$$/, ''), v as TwingCallable<any>, []));
	}

	return async function (data: Data): Promise<void> {
		const result = await env.render(typeof view === 'function' ? view(data) : view, data);
		const outputPath = path.resolve(outDir, outFile(data));
		fs.mkdirSync(path.dirname(outputPath), { recursive: true });
		fs.writeFileSync(outputPath, result);
	};
}
