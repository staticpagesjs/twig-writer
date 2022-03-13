import * as fs from 'fs';
import * as path from 'path';
import { Script } from 'vm';
import * as yaml from 'js-yaml';
import { fileWriterOptionsFromCliParameters } from '@static-pages/file-writer';
import { twigWriter, TwigWriterOptions } from './index.js';

const isFunctionLike = /^\s*(?:async)?\s*(?:\([a-zA-Z0-9_, ]*\)\s*=>|[a-zA-Z0-9_,]+\s*=>|function\s*\*?\s*[a-zA-Z0-9_,]*\s*\([a-zA-Z0-9_,]*\)\s*{)/;
const tryParseFunction = (value: string): string | { (data: Record<string, unknown>): string } => {
	if (isFunctionLike.test(value)) {
		return new Script(value).runInNewContext();
	}
	return value;
};

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && !!x;
const isUnknownFunction = (x: unknown): x is { (...args: unknown[]): unknown } => typeof x === 'function';
const isTwigFiltersObject = (x: unknown): x is Exclude<TwigWriterOptions['filters'], undefined> => (
	typeof x === 'object' && !!x && Object.values(x).every(v => (
		(Array.isArray(v) && typeof v[0] === 'function' && typeof v[1] === 'object')
		|| typeof v === 'function'
	))
);
const isTwigFunctionsObject = (x: unknown): x is Exclude<TwigWriterOptions['functions'], undefined> => (
	typeof x === 'object' && !!x && Object.values(x).every(v => (
		(Array.isArray(v) && typeof v[0] === 'function' && typeof v[1] === 'object')
		|| typeof v === 'function'
	))
);

/**
 * Imports an ES or CJS module, relative from the process.cwd().
 *
 * @param moduleName Module path.
 * @param exportName Preferred export, if not exists fallbacks to default, then a cjs function export.
 * @returns Module exports.
 */
const importModule = async (moduleName: string, exportName: string): Promise<unknown> => {
	try {
		const module = await import(moduleName.startsWith('.') ? path.resolve(process.cwd(), moduleName) : moduleName);
		return module[exportName] ?? module.default ?? module;
	} catch (error: unknown) {
		throw new Error(`Failed to load module '${moduleName}': ${error instanceof Error ? error.message : error}\n${error instanceof Error ? 'Trace: ' + error.stack : 'No stack trace available.'}`);
	}
};

/**
 * Imports a CJS or ESM module based on the cli arguments passed.
 */
const tryImportModuleCli = async (optionName: string, optionValue: unknown): Promise<unknown> => {
	if (typeof optionValue === 'string') {
		const module = await importModule(optionValue, optionName);
		if (typeof module === 'undefined')
			throw new Error(`twig-writer failed to load module specified in '${optionName}' option: imported value is 'undefined'.`);

		return module;
	} else if (isObject(optionValue)) {
		if (typeof optionValue.module !== 'string')
			throw new Error(`twig-writer '${optionName}.module' option is invalid type, expected string.`);
		if (typeof optionValue.export !== 'undefined' && typeof optionValue.export !== 'string')
			throw new Error(`twig-writer '${optionName}.export' option is invalid type, expected string.`);

		const module = await importModule(optionValue.module, optionValue.export ?? optionName);
		if (typeof module === 'undefined')
			throw new Error(`twig-writer failed to load module specified in '${optionName}' option: imported value is 'undefined'.`);

		return module;
	} else if (typeof optionValue !== 'undefined') {
		throw new Error(`twig-writer '${optionName}' option is invalid type, expected object or string.`);
	}
};

export const twigWriterOptionsFromCliParameters = async (cliParams: Record<string, unknown> = {}) => {
	const {
		view,
		globals,
		functions,
		filters,
		advanced,
		...rest
	} = cliParams;
	const options = { ...rest } as TwigWriterOptions;

	// VIEW
	if (typeof view === 'string') {
		options.view = tryParseFunction(view);
	}

	// GLOBALS
	if (typeof globals === 'string') {
		if (!fs.existsSync(globals)) {
			throw new Error(`twig-writer 'globals': '${globals}' file does not exists.`);
		}
		try {
			options.globals = yaml.load(fs.readFileSync(globals, 'utf-8')) as TwigWriterOptions['globals'];
		} catch (e) {
			throw new Error('twig-writer \'globals\' failed to open/parse file.');
		}
		if (typeof options.globals !== 'object' && !options.globals) {
			throw new Error('twig-writer \'globals\' failed to retrieve object map.');
		}
	}

	// FUNCTIONS
	const importedFunctions = await tryImportModuleCli('functions', functions);
	if (typeof importedFunctions !== 'undefined') {
		if (!isTwigFunctionsObject(importedFunctions)) {
			throw new Error('twig-writer failed to load module specified in \'functions\' option: imported value is not a function map.');
		}
		options.functions = importedFunctions;
	}

	// FILTERS
	const importedFilters = await tryImportModuleCli('filters', filters);
	if (typeof importedFilters !== 'undefined') {
		if (!isTwigFiltersObject(importedFilters)) {
			throw new Error('twig-writer failed to load module specified in \'filters\' option: imported value is not a function map.');
		}
		options.filters = importedFilters;
	}

	// ADVANCED
	const importedAdvanced = await tryImportModuleCli('advanced', advanced);
	if (typeof importedAdvanced !== 'undefined') {
		if (!isUnknownFunction(importedAdvanced)) {
			throw new Error('twig-writer failed to load module specified in \'advanced\' option: imported value is not a function.');
		}
		options.advanced = importedAdvanced;
	}

	return fileWriterOptionsFromCliParameters(options);
};

export const cli = async (cliParams: Record<string, unknown> = {}) => twigWriter(await twigWriterOptionsFromCliParameters(cliParams));
