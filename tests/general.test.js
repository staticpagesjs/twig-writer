const fs = require('fs');
jest.spyOn(fs, 'writeFileSync').mockImplementation();
jest.spyOn(fs, 'mkdirSync').mockImplementation();

const path = require('path');
const twigWriter = require('../lib/cjs/index').default;

afterEach(() => {
	jest.clearAllMocks();
});

test('simple writer test', async () => {
	const writer = await twigWriter({
		viewsDir: 'tests/views'
	});

	await writer({
		body: 'foo',
	});

	const expectedPath = path.resolve('build/unnamed-1.html');
	const expectedContent = 'hello world!\n<p>foo</p>\n';

	expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
	expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, expectedContent);
});
