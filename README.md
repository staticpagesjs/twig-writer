# Static Pages / Twig Writer

Renders page data via twig templates.

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
| `showdownEnabled` | `boolean` | `true` | Register a markdown filter; uses [showdown](http://showdownjs.com/). |
| `showdownOptions` | `showdown.ConverterOptions` | `{ simpleLineBreaks: true, ghCompatibleHeaderId: true, customizedHeaderId: true, tables: true }` | Custom options for the showdown markdown renderer. |

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

### `outFile` defaults
The default behaviour is to guess file path by a few possible properties of the data:

- if `data.url` is defined, append `.html` and use that.
- if `data.header.path` is defined, replace extension to `.html` and use that.
- if nothing matches call the `onInvalidPath` handler with `undefined` file name.
