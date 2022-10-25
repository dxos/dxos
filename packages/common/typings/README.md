# Typings

This is a staging area for Typescript definitions that are either not available from the third-party packages directly
or from [Definitely Typed](https://github.com/DefinitelyTyped/DefinitelyTyped).

## Usage

- Each package must include `@dxos/typings` in the `types` section of its `tsconfig.json` file.
- The workspace global `package.json` contains a reference to `@dxos/typings` so that all projects include it
  in their `devDependencies`.

## Creating Typings

- Create shared typings here as a potential staging ground for [Definitely Typed](https://github.com/DefinitelyTyped/DefinitelyTyped).
- Keep one-off typings in the local repo in a `./src/typings.d.ts`.
- Be careful to include required imports inside each module definition.
