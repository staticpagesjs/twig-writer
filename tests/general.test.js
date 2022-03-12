const fs = require('fs');
jest.spyOn(fs, 'writeFileSync').mockImplementation();
jest.spyOn(fs, 'mkdirSync').mockImplementation();

const path = require('path');
const twigWriter = require('../cjs/index').default;

process.chdir(__dirname); // cwd should be in tests folder where we provide a proper folder structure.
// TODO: mock fs to provide a more stable environment for the tests?

afterEach(() => {
	jest.clearAllMocks();
});

test('can initialize a writer with default parameters', async () => {
	const writer = twigWriter();
	expect(writer).toBeDefined();
});

test('can render a simple template', async () => {
	const writer = twigWriter();

	await writer({
		body: 'foo',
	});

	const expectedPath = path.resolve('build/unnamed-1.html');
	const expectedContent = 'hello world!<p>foo</p>';

	expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
	expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, expectedContent);
});

test('can set multiple views dir with initial view', async () => {
	const writer = twigWriter({
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

test('can use globals', async () => {
	const writer = twigWriter({
		view: 'globals.test.twig',
		globals: {
			globalValue: 'foo bar'
		}
	});

	await writer({
		body: 'foo',
	});

	const expectedPath = path.resolve('build/unnamed-1.html');
	const expectedContent = 'foo bar';

	expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
	expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, expectedContent);
});

test('can set output dir', async () => {
	const writer = twigWriter({
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

test('can set outfile name via output.path', async () => {
	const writer = twigWriter();

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

test('can set outfile name via output.url', async () => {
	const writer = twigWriter();

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

test('can set outfile name via header.path', async () => {
	const writer = twigWriter();

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

test('can set outfile name via outFile option', async () => {
	const writer = twigWriter({
		outFile: () => 'my/output.file'
	});

	await writer({
		body: 'foo',
	});

	const expectedPath = path.resolve('build/my/output.file');
	const expectedContent = 'hello world!<p>foo</p>';

	expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
	expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, expectedContent);
});

test('can set additional twig functions', async () => {
	const writer = twigWriter({
		view: 'functions.test.twig',
		functions: {
			myfn(x) { return x; },
		}
	});

	await writer({
		body: 'foo bar',
	});

	const expectedPath = path.resolve('build/unnamed-1.html');
	const expectedContent = 'foo bar';

	expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
	expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, expectedContent);
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
		body: '<foo>',
	});

	const expectedPath = path.resolve('build/unnamed-1.html');
	const expectedContent = '&lt;foo&gt;<foo>';

	expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
	expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, expectedContent);
});

test('can set additional twig filters', async () => {
	const writer = twigWriter({
		view: 'filters.test.twig',
		filters: {
			myfn(x) { return x; },
		}
	});

	await writer({
		body: 'foo bar',
	});

	const expectedPath = path.resolve('build/unnamed-1.html');
	const expectedContent = 'foo bar';

	expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
	expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, expectedContent);
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
		body: '<foo>',
	});

	const expectedPath = path.resolve('build/unnamed-1.html');
	const expectedContent = '&lt;foo&gt;<foo>';

	expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
	expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, expectedContent);
});

test('can configure with advanced configuration', async () => {
	const writer = twigWriter({
		advanced: env => env.addGlobal('globalValue', 'foo bar')
	});

	await writer({
		body: 'foo',
	});

	const expectedPath = path.resolve('build/unnamed-1.html');
	const expectedContent = 'hello world!<p>foo</p>';

	expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
	expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, expectedContent);
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
		body: '# foo',
	});

	const expectedPath = path.resolve('build/unnamed-1.html');
	const expectedContent = '<h2 id="foo">foo</h2>';

	expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
	expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, expectedContent);
});
