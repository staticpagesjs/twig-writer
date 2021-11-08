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
	const expectedContent = 'hello world!\n<p>foo</p>\n';

	expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
	expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, expectedContent);
});
