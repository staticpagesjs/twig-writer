# Static Pages / Twig Writer

Renders page data via twig templates.

Uses the [Twing](https://www.npmjs.com/package/twing) package under the hood. Everything provided by twing is also exported from this package (for advanced configuration).

This package is part of the StaticPagesJs project, see:
- Documentation: [staticpagesjs.github.io](https://staticpagesjs.github.io/)
- Core: [@static-pages/core](https://www.npmjs.com/package/@static-pages/core)
- CLI: [@static-pages/cli](https://www.npmjs.com/package/@static-pages/cli)

## Options

| Option | Type | Default value | Description |
|--------|------|---------------|-------------|
| `view` | `string \| (d: Data) => string` | `main.twig` | Template to render. If it's a function it gets evaluated on each render call. |
| `viewsDir` | `string \| string[]` | `views` | One or more directory path where the templates are found. |
| `outDir` | `string` | `build` | Directory where the rendered output is saved. |
| `outFile` | `string \| (d: Data) => string` | *see outFile defaults section* | Path of the rendered output relative to `outDir`. |
| `globals` | `object` | `{}` | Additional properties loaded to the twig environment as globals. |
| `functions` | `Record<string, TwigFunction>` | `{}` | Functions in an object that gets loaded to the twig environment. |
| `filters` | `Record<string, TwigFilter>` | `{}` | Filters in an object that gets loaded to the twig environment. |
| `advanced` | `(env: TwingEnvironment) => void` | `() => undefined` | Allows advanced configuration via access to the `env` twig environment. |
| `markdownFilter` | `boolean` | `true` | Register a custom markdown twig filter; uses [showdown](http://showdownjs.com/). |
| `showdownOptions` | `showdown.ConverterOptions` | `{ ghCompatibleHeaderId: true, customizedHeaderId: true, tables: true }` | Custom options for the showdown markdown renderer. |

Types used in options above (also exported by the module):
```ts
type TwigFunction = TwingCallable<unknown> | {
	fn: TwingCallable<unknown>,
	options?: TwingCallableWrapperOptions,
};
```

```ts
type TwigFilter = TwingCallable<unknown> | {
	fn: TwingCallable<unknown>,
	options?: TwingFilterOptions,
};
```

### `outFile` defaults
The default behaviour is to guess file path by a few possible properties of the data:

- if `data.output.path` is defined, use that.
- if `data.output.url` is defined, append `.html` and use that.
- if `data.headers.path` is defined, replace extension to `.html` and use that.
- if nothing matches, name it `unnamed-{n}.html` where `{n}` is a counter.

## CLI
This module exports a `cli` function which used to initialize configuration coming from config file or from CLI options where only JSON input is possible at best.
Everything defined in the `Options` section is valid with the following additions:

| Option | Description |
|--------|-------------|
| `view` | If view looks like a function we evaluate it in a sandbox to a real JS function. |
| `outFile` | If outFile looks like a function we evaluate it in a sandbox to a real JS function. |
| `globals` | Is a path to a YAML file. Loaded as globals. |
| `functions` | Is a path to a CommonJS module. You can provide an object with `module` and `import` keys to also specify the imported component. |
| `filters` | Is a path to a CommonJS module. You can provide an object with `module` and `import` keys to also specify the imported component. |
| `advanced` | Is a path to a CommonJS module. You can provide an object with `module` and `import` keys to also specify the imported component. |