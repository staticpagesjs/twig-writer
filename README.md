# Static Pages / Twig File Writer

Renders page data via twig templates into files.

Merges the [@static-pages/file-writer](https://www.npmjs.com/package/@static-pages/file-writer) and [@static-pages/twig-renderer](https://www.npmjs.com/package/@static-pages/twig-renderer) packages together for convenience.

This package is part of the StaticPagesJs project, see:
- Documentation: [staticpagesjs.github.io](https://staticpagesjs.github.io/)
- Core: [@static-pages/core](https://www.npmjs.com/package/@static-pages/core)

## Usage

```js
import twigWriter from '@static-pages/twig-writer';

const writer = twigRenderer({
	outDir: 'dist',
	outFile: d => d.urlPrefix + d.url,
	viewsDir: 'myViews',
	view: 'content.twig',
});

const pageData = { title: 'Page header', body: 'My Content' };

writer(pageData); // writes the rendered page to the disk as a file.
```

## Options
The available options are an union of the `file-writer` options and the `twig-renderer` options.
