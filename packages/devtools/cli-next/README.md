# @dxos/cli-next

## Run locally

To run the CLI locally first compile it:

```bash
moon run cli-next:compile
```

Once it's compiled it can be run from the cli-next package:

```bash
./dist/node-esm/bin.mjs
```

## Development

```bash
npx tsx ./src/bin.ts --help
```

TODO: Setup dev runner with `vite-node`.

## CLI Design Guide

- Each command be in its own folder.
- Keep the command definitions file simple and compact with minimal logic and a single export:
  - IDEA(burdon): Single default export for command folder?
  - Inline command options.
  - Inline command handler with preconditions checks then dispatch to testable logic to other files.
- Try to avoid product names (e.g., "composer" in args or commands).
- ISSUE(burdon): camelCase vs hyphenated options?

## Resources

- [Effect CLI](https://github.com/Effect-TS/effect/blob/main/packages/cli/README.md)
- [Effect CLI Docs](https://effect-ts.github.io/effect/docs/cli)
- [Example](https://github.com/Effect-TS/examples/tree/main/templates/cli)
