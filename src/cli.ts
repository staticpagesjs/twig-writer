import * as fs from 'fs';
import { Script } from 'vm';
import importFrom from 'import-from';
import * as yaml from 'js-yaml';
import twigWriter, { TwigWriterOptions } from './index.js';

const isFunctionLike = /^\s*(?:async)?\s*(?:\([a-zA-Z0-9_, ]*\)\s*=>|[a-zA-Z0-9_,]+\s*=>|function\s*\*?\s*[a-zA-Z0-9_,]*\s*\([a-zA-Z0-9_,]*\)\s*{)/;

function tryParseFunction(value: string): string | { (data: Record<string, unknown>): string } {
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
