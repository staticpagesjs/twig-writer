# Static Pages / Twig File Writer

Renders page data via twig templates into files.

Uses the [Twing](https://www.npmjs.com/package/twing) package under the hood. Everything provided by Twing is also exported from this package (for advanced configuration).

This package is part of the StaticPagesJs project, see:
- Documentation: [staticpagesjs.github.io](https://staticpagesjs.github.io/)
- Core: [@static-pages/core](https://www.npmjs.com/package/@static-pages/core)

## Options

| Option | Type | Default value | Description |
|--------|------|---------------|-------------|
| `view` | `string \| (d: Data) => string` | `main.twig` | Template to render. If it's a function it gets evaluated on each render call. |
| `viewsDir` | `string \| string[]` | `views` | One or more directory path where the templates are found. |
| `outDir` | `string` | `dist` | Directory where the rendered output is saved. |
| `outFile` | `string \| (d: Data) => string` | *see outFile section* | Path of the rendered output relative to `outDir`. |
| `onOverwrite` | `(d: string) => void` | `console.warn(...)` | Callback function that gets executed when a file name collision occurs. |
| `onInvalidPath` | `(d: string) => void` | `console.warn(...)` | Callback function that gets executed when a file name contains invalid characters. |
| `globals` | `object` | `{}` | Additional properties loaded to the twig environment as globals. |
| `functions` | `TwigFunctionMap` | `{}` | Functions in an object that gets loaded to the twig environment. |
| `filters` | `TwigFilterMap` | `{}` | Filters in an object that gets loaded to the twig environment. |
| `advanced` | `(env: TwingEnvironment) => void` | `() => undefined` | Allows advanced configuration via access to the `env` twig environment. |
| `markedEnabled` | `boolean` | `true` | Register a markdown filter; uses [marked](https://marked.js.org/). |
| `markedOptions` | `marked.MarkedOptions` | *see markedOptions section* | Custom options for the marked markdown renderer. |

Custom types used in the table above:
```ts
type TwigFunctionMap = Record<string, TwingCallable<unknown> | [
	TwingCallable<unknown>,
	TwingCallableWrapperOptions,
]>;
type TwigFilterMap = Record<string, TwingCallable<unknown> | [
	TwingCallable<unknown>,
	TwingFilterOptions,
]>;
```

Example for `TwigFunctionMap` and `TwigFilterMap`:
```ts
export const myTwigFiltersOrFunctions = {
	asset(asset: string) {
		return new URL(asset, '/site/assets/').toString();
	},
	json_formatted: [
		d => JSON.stringify(d, null, 4),
		{ is_safe: ['html'] }
	],
};
```

> The defined functions above can be an async functions or regular sync functions. No restrictions like the underlying Twing package makes where you allowed to use async functions only.

### `outFile` defaults
The default behaviour is to guess file path by a few possible properties of the data:

- if `data.url` is defined, append `.html` and use that.
- if `data.header.path` is defined, replace extension to `.html` and use that.
- if nothing matches call the `onInvalidPath` handler with `undefined` file name. This callback exists only for logging purposes.

### `markedOptions` defaults
This package uses the default options of the [official marked defaults](https://marked.js.org/using_advanced#options):

In `twig` files there is a possibility to pass markdown options to the underlying markdown renderer. Example:

```twig
{{ '[foo](foo)'|markdown({ baseUrl: 'http://example.com' }) }}
```
```html
<p><a href="http://example.com/foo">foo</a></p>
```

Additionally there is an `inline` option added to the available options. This removes the paragraphs tags. Example:

```twig
{{ '[foo](foo)'|markdown({ inline: true, baseUrl: 'http://example.com' }) }}
```
```html
<a href="http://example.com/foo">foo</a>
```
