# Namespace modules

The canonical shape of an Effect-style module in the DXOS monorepo. This is the
single source of truth referenced by the `code-style` skill and by the
`org.dxos.mdl.module@1.0` `.mdl` extension (`module` blocks reference this file
rather than restating the rules inline). Use `@dxos/echo` as the reference
implementation.

## What a module is

A **module** is a single source file that groups a cohesive set of public
values, types, and functions, and is consumed by callers as a namespace. The
namespace — not the individual members — is the unit of import.

## Rules

- **PascalCase name.** The file is named after the namespace it exports, e.g.
  `RpcTiming.ts`, `Query.ts`, `Obj.ts`. The file name is the namespace name.
- **Lives in `src/`.** Modules are top-level in the package `src/` directory.
  Non-exported implementation detail lives under `src/internal/` and is never
  re-exported as a namespace.
- **Marked `@import-as-namespace`.** The first line of the module body carries
  the `// @import-as-namespace` linter directive
  (`@dxos/eslint-plugin-rules/import-as-namespace`), which marks the file as a
  namespace export and enforces that callers import it as a namespace.
- **Re-exported from `index.ts` as a namespace.** The package barrel re-exports
  the module with `export * as <Name> from './<Name>'`. Callers reach every
  member through the namespace: `RpcTiming.serverLayer`, not a bare
  `rpcTimingServerLayer` import.
- **Members are unprefixed.** Because callers always see `<Name>.<member>`, do
  not repeat the namespace in member names. Inside `RpcTiming.ts` prefer
  `Options`, `Metadata`, `serverLayer` over `RpcTimingOptions`,
  `RpcTimingMetadata`, `rpcTimingServerLayer` — the caller reads
  `RpcTiming.Options` either way. This applies to top-level types, tags,
  constants, and functions alike.

## Directory shape

```text
src/
  RpcTiming.ts      // @import-as-namespace — the module
  Rpc.ts            // sibling module; imports `* as RpcTiming`
  errors.ts         // exported directly (exception)
  index.ts          // barrel
  internal/         // hidden implementation, not exported
  testing/          // exported directly (exception)
```

```ts
// index.ts
export * as RpcTiming from './RpcTiming';
export * as Rpc from './Rpc';
export * from './errors';
```

```ts
// RpcTiming.ts

// @import-as-namespace
export const SENT_AT_HEADER = 'x-dxos-rpc-sent-at';

export type Options = { readonly minLogMs?: number };

export const serverLayer = (options?: Options) => {
  /* ... */
};
```

## Sibling imports

A module that depends on another imports it as a namespace, not by deep-importing
its members:

```ts
// Rpc.ts
import * as RpcTiming from './RpcTiming';

const enabled = RpcTiming.isEnabled(options?.timing);
```

For `@dxos/echo`-style entrypoints importing `src/internal/<Module>/`, import the
capitalized internal barrel as a lowercase `*Internal` namespace
(`import * as objInternal from './internal/Obj'`); do not deep-import submodules.

## Exceptions

- `errors.ts` and `testing/` are exported directly rather than as a namespace.
- Overloaded exported functions are declared as `const` with inline overload
  signatures (see the `code-style` skill, "Types and signatures").
