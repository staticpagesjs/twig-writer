import { fileWriter } from '@static-pages/file-writer';
import { twigRenderer } from '@static-pages/twig-renderer';

export { marked, twing } from '@static-pages/twig-renderer';

export namespace twigWriter {
	export type Options = twigRenderer.Options & Omit<fileWriter.Options, 'renderer'>;
}

export const twigWriter = ({
	view = 'main.twig',
	viewsDir = 'views',
	globals = {},
	functions = {},
	filters = {},
	advanced = () => undefined,
	markedEnabled = true,
	markedOptions = {},
	...rest
}: twigWriter.Options = {}) => fileWriter({
	...rest,
	renderer: twigRenderer({
		view,
		viewsDir,
		globals,
		functions,
		filters,
		advanced,
		markedEnabled,
		markedOptions,
	}),
});

export default twigWriter;
