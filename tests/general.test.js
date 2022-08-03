import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import rimraf from 'rimraf';
import { twigWriter } from '../esm/index.js';

// cwd should be in tests folder where we provide a proper folder structure.
process.chdir(path.dirname(fileURLToPath(import.meta.url)));

// TODO: mock fs to provide a more stable environment for the tests?

afterEach(() => {
	rimraf.sync('dist');
});

test('can initialize a writer with default parameters', async () => {
	const writer = twigWriter();
	expect(writer).toBeDefined();
});

test('can render a simple template', async () => {
	const writer = twigWriter();

	await writer({
		url: 'unnamed',
		body: 'foo',
	});

	const expectedPath = 'dist/unnamed.html';
	const expectedContent = 'hello world!<p>foo</p>';

	expect(fs.existsSync(expectedPath)).toBe(true);
	expect(fs.readFileSync(expectedPath, 'utf-8')).toBe(expectedContent);
});

test('can set multiple views dir with initial view', async () => {
	const writer = twigWriter({
		view: 'userview.twig',
		viewsDir: [
			'views2/userViews1',
			'views2/userViews2'
		]
	});

	await writer({
		url: 'unnamed',
		body: 'foo',
	});

	const expectedPath = 'dist/unnamed.html';
	const expectedContent = '__*<p>foo</p>*__';

	expect(fs.existsSync(expectedPath)).toBe(true);
	expect(fs.readFileSync(expectedPath, 'utf-8')).toBe(expectedContent);
});

test('can use globals', async () => {
	const writer = twigWriter({
		view: 'globals.test.twig',
		globals: {
			globalValue: 'foo bar'
		}
	});

	await writer({
		url: 'unnamed',
		body: 'foo',
	});

	const expectedPath = 'dist/unnamed.html';
	const expectedContent = 'foo bar';

	expect(fs.existsSync(expectedPath)).toBe(true);
	expect(fs.readFileSync(expectedPath, 'utf-8')).toBe(expectedContent);
});

test('can set output dir', async () => {
	const writer = twigWriter({
		outDir: 'dist'
	});

	await writer({
		url: 'unnamed',
		body: 'foo',
	});

	const expectedPath = 'dist/unnamed.html';
	const expectedContent = 'hello world!<p>foo</p>';

	expect(fs.existsSync(expectedPath)).toBe(true);
	expect(fs.readFileSync(expectedPath, 'utf-8')).toBe(expectedContent);
});

test('can set outfile name via header.path', async () => {
	const writer = twigWriter();

	await writer({
		header: {
			path: 'my/output.file'
		},
		body: 'foo',
	});

	const expectedPath = 'dist/my/output.html';
	const expectedContent = 'hello world!<p>foo</p>';

	expect(fs.existsSync(expectedPath)).toBe(true);
	expect(fs.readFileSync(expectedPath, 'utf-8')).toBe(expectedContent);
});

test('can set outfile name via outFile option', async () => {
	const writer = twigWriter({
		outFile: () => 'my/output.file'
	});

	await writer({
		body: 'foo',
	});

	const expectedPath = 'dist/my/output.file';
	const expectedContent = 'hello world!<p>foo</p>';

	expect(fs.existsSync(expectedPath)).toBe(true);
	expect(fs.readFileSync(expectedPath, 'utf-8')).toBe(expectedContent);
});

test('can set additional twig functions', async () => {
	const writer = twigWriter({
		view: 'functions.test.twig',
		functions: {
			myfn(x) { return x; },
		}
	});

	await writer({
		url: 'unnamed',
		body: 'foo bar',
	});

	const expectedPath = 'dist/unnamed.html';
	const expectedContent = 'foo bar';

	expect(fs.existsSync(expectedPath)).toBe(true);
	expect(fs.readFileSync(expectedPath, 'utf-8')).toBe(expectedContent);
});

test('can set additional twig functions with options', async () => {
	const writer = twigWriter({
		view: 'functions-opts.test.twig',
		functions: {
			myfn_safe: [
				x => x,
				{ is_safe: ['html'] }
			],
			myfn: x => x,
		}
	});

	await writer({
		url: 'unnamed',
		body: '<foo>',
	});

	const expectedPath = 'dist/unnamed.html';
	const expectedContent = '&lt;foo&gt;<foo>';

	expect(fs.existsSync(expectedPath)).toBe(true);
	expect(fs.readFileSync(expectedPath, 'utf-8')).toBe(expectedContent);
});

test('can set additional twig filters', async () => {
	const writer = twigWriter({
		view: 'filters.test.twig',
		filters: {
			myfn(x) { return x; },
		}
	});

	await writer({
		url: 'unnamed',
		body: 'foo bar',
	});

	const expectedPath = 'dist/unnamed.html';
	const expectedContent = 'foo bar';

	expect(fs.existsSync(expectedPath)).toBe(true);
	expect(fs.readFileSync(expectedPath, 'utf-8')).toBe(expectedContent);
});

test('can set additional twig filters with options', async () => {
	const writer = twigWriter({
		view: 'filters-opts.test.twig',
		filters: {
			myfn_safe: [
				x => x,
				{ is_safe: ['html'] }
			],
			myfn: x => x,
		}
	});

	await writer({
		url: 'unnamed',
		body: '<foo>',
	});

	const expectedPath = 'dist/unnamed.html';
	const expectedContent = '&lt;foo&gt;<foo>';

	expect(fs.existsSync(expectedPath)).toBe(true);
	expect(fs.readFileSync(expectedPath, 'utf-8')).toBe(expectedContent);
});

test('can configure with advanced configuration', async () => {
	const writer = twigWriter({
		advanced: env => env.addGlobal('globalValue', 'foo bar')
	});

	await writer({
		url: 'unnamed',
		body: 'foo',
	});

	const expectedPath = 'dist/unnamed.html';
	const expectedContent = 'hello world!<p>foo</p>';

	expect(fs.existsSync(expectedPath)).toBe(true);
	expect(fs.readFileSync(expectedPath, 'utf-8')).toBe(expectedContent);
});

test('can turn off custom markdown filter', async () => {
	const writer = twigWriter({
		showdownEnabled: false
	});

	await expect(async () => {
		await writer({
			body: 'foo',
		});
	})
		.rejects
		.toThrow('Unknown "markdown" filter');
});

test('can configure showdown filter', async () => {
	const writer = twigWriter({
		view: 'showdown.twig',
		showdownOptions: {
			headerLevelStart: 2
		}
	});

	await writer({
		url: 'unnamed',
		body: '# foo',
	});

	const expectedPath = 'dist/unnamed.html';
	const expectedContent = '<h2 id="foo">foo</h2>';

	expect(fs.existsSync(expectedPath)).toBe(true);
	expect(fs.readFileSync(expectedPath, 'utf-8')).toBe(expectedContent);
});
