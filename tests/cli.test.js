const fs = require('fs');
jest.spyOn(fs, 'writeFileSync').mockImplementation();
jest.spyOn(fs, 'mkdirSync').mockImplementation();

const path = require('path');
const twigWriter = require('../cjs/index').cli;

process.chdir(__dirname); // cwd should be in tests folder where we provide a proper folder structure.
// TODO: mock fs to provide a more stable environment for the tests?

afterEach(() => {
	jest.clearAllMocks();
});

test('cli: can initialize a writer with default parameters', async () => {
	const writer = await twigWriter();
	expect(writer).toBeDefined();
});

test('cli: can render a simple template', async () => {
	const writer = await twigWriter();

	await writer({
		body: 'foo',
	});

	const expectedPath = path.resolve('build/unnamed-1.html');
	const expectedContent = 'hello world!<p>foo</p>';

	expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
	expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, expectedContent);
});

test('cli: can set multiple views dir with initial view', async () => {
	const writer = await twigWriter({
		view: 'userview.twig',
		viewsDir: [
			'config/userViews1',
			'config/userViews2'
		]
	});

	await writer({
		body: 'foo',
	});

	const expectedPath = path.resolve('build/unnamed-1.html');
	const expectedContent = '__*<p>foo</p>*__';

	expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
	expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, expectedContent);
});

test('cli: can use globals', async () => {
	const writer = await twigWriter({
		view: 'globals.test.twig',
		globals: './config/globals/cli.js'
	});

	await writer({
		body: 'foo',
	});

	const expectedPath = path.resolve('build/unnamed-1.html');
	const expectedContent = 'foo bar';

	expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
	expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, expectedContent);
});

test('cli: can set output dir', async () => {
	const writer = await twigWriter({
		outDir: 'dist'
	});

	await writer({
		body: 'foo',
	});

	const expectedPath = path.resolve('dist/unnamed-1.html');
	const expectedContent = 'hello world!<p>foo</p>';

	expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
	expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, expectedContent);
});

test('cli: can set outfile name via output.path', async () => {
	const writer = await twigWriter();

	await writer({
		output: {
			path: 'my/output.file'
		},
		body: 'foo',
	});

	const expectedPath = path.resolve('build/my/output.file');
	const expectedContent = 'hello world!<p>foo</p>';

	expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
	expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, expectedContent);
});

test('cli: can set outfile name via output.url', async () => {
	const writer = await twigWriter();

	await writer({
		output: {
			url: 'my/output.file'
		},
		body: 'foo',
	});

	const expectedPath = path.resolve('build/my/output.file.html');
	const expectedContent = 'hello world!<p>foo</p>';

	expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
	expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, expectedContent);
});

test('cli: can set outfile name via header.path', async () => {
	const writer = await twigWriter();

	await writer({
		header: {
			path: 'my/output.file'
		},
		body: 'foo',
	});

	const expectedPath = path.resolve('build/my/output.html');
	const expectedContent = 'hello world!<p>foo</p>';

	expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
	expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, expectedContent);
});

test('cli: can set outfile name via outFile option', async () => {
	const writer = await twigWriter({
		outFile: '() => "my/output.file"',
	});

	await writer({
		body: 'foo',
	});

	const expectedPath = path.resolve('build/my/output.file');
	const expectedContent = 'hello world!<p>foo</p>';

	expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
	expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, expectedContent);
});

test('cli: can set additional twig functions', async () => {
	const writer = await twigWriter({
		view: 'functions.test.twig',
		functions: './config/fn/myfn.js',
	});

	await writer({
		body: 'foo bar',
	});

	const expectedPath = path.resolve('build/unnamed-1.html');
	const expectedContent = 'foo bar';

	expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
	expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, expectedContent);
});

test('cli: can set additional twig functions with options', async () => {
	const writer = await twigWriter({
		view: 'functions-opts.test.twig',
		functions: './config/fn/myfn_safe.js',
	});

	await writer({
		body: '<foo>',
	});

	const expectedPath = path.resolve('build/unnamed-1.html');
	const expectedContent = '&lt;foo&gt;<foo>';

	expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
	expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, expectedContent);
});

test('cli: can set additional twig filters', async () => {
	const writer = await twigWriter({
		view: 'filters.test.twig',
		filters: './config/fn/myfn.js',
	});

	await writer({
		body: 'foo bar',
	});

	const expectedPath = path.resolve('build/unnamed-1.html');
	const expectedContent = 'foo bar';

	expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
	expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, expectedContent);
});

test('cli: can set additional twig filters with options', async () => {
	const writer = await twigWriter({
		view: 'filters-opts.test.twig',
		filters: './config/fn/myfn_safe.js',
	});

	await writer({
		body: '<foo>',
	});

	const expectedPath = path.resolve('build/unnamed-1.html');
	const expectedContent = '&lt;foo&gt;<foo>';

	expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
	expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, expectedContent);
});

test('cli: can configure with advanced configuration', async () => {
	const writer = await twigWriter({
		advanced: './config/fn/adv.js',
	});

	await writer({
		body: 'foo',
	});

	const expectedPath = path.resolve('build/unnamed-1.html');
	const expectedContent = 'hello world!<p>foo</p>';

	expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
	expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, expectedContent);
});

test('cli: can turn off custom markdown filter', async () => {
	const writer = await twigWriter({
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

test('cli: can configure showdown filter', async () => {
	const writer = await twigWriter({
		view: 'showdown.twig',
		showdownOptions: {
			headerLevelStart: 2
		}
	});

	await writer({
		body: '# foo',
	});

	const expectedPath = path.resolve('build/unnamed-1.html');
	const expectedContent = '<h2 id="foo">foo</h2>';

	expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
	expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, expectedContent);
});
