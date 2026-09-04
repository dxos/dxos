---
name: effect
description: Use when writing or changing Effect code, composing test layer stacks, working with Schema or SchemaAST, or reading pre-migration code.
---

# Effect in DXOS

Answer Effect questions from `node_modules/effect` rather than from recall. What is
on disk is **pinned** to the version this repo compiles against. What you remember is
pinned to nothing, and Effect moves.

## The pinned copy

Unlike nearly every other package, `effect` publishes its TypeScript source and its
own agent documentation to npm, matched to the exact version this repo compiles
against. Its `files` field ships `src/**/*.ts`, `AGENTS.md`, and `ai-docs/**`, so
this is real source on disk, not `dist`:

| Path                                 | What it holds                                                                                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node_modules/effect/AGENTS.md`      | The Effect team's authoring guide, 380 lines                                                                                                                        |
| `node_modules/effect/ai-docs/src/**` | 48 compiling examples, one per topic, linked from `AGENTS.md`                                                                                                       |
| `node_modules/effect/src/**`         | 436 files of implementation, JSDoc and every export, including the `unstable/` tree that holds `sql`, `http`, `httpapi`, `cli`, `ai`, `cluster` and `observability` |

effect.website tracks `main`; the pinned copy tracks what you compile against.

Research that reaches past the pinned copy, to an upstream issue, a migration note or
a blog post, has to match the installed version first. `pnpm-workspace.yaml` pins the
`effect` catalog entry, currently a 4.x release candidate; material written for 3.x
describes a different library.

Tests are the one thing npm leaves out: the package has no `test/` or `dtslint/`.

`node_modules/effect` is a pnpm symlink into `.pnpm/effect@<version>/`, and it is
gitignored, so nothing will surface it for you. Open it by path.

## Lookup order

Before writing Effect, in this order, stopping as soon as the answer is settled:

1. **Read a neighbour.** Find the nearest DXOS file already doing this and copy its
   shape. House conventions beat upstream defaults.
2. **Read `node_modules/effect/AGENTS.md`**, then follow its link to the
   `ai-docs/src/**` example for your topic.
3. **Grep `node_modules/effect/src/`** for the exact export. This settles whether an
   API exists and what its signature is.
4. **Check the divergences below.** Three DXOS rules override the pinned guide.

Done when every Effect API in the change either came from a neighbouring DXOS file or
was confirmed by grep in `node_modules/effect/src/`.

## Where DXOS diverges from the pinned guide

`AGENTS.md` applies as written except on three points, where following it literally
produces broken or off-convention code here.

**Domain errors are `BaseError.extend`, not `Schema.TaggedError`.** `BaseError` from
`@dxos/errors` supplies a `_tag` getter, so `Effect.catchTag` still discriminates,
and it carries `context`, `wrap`, and `is` that the rest of the stack expects. Keep
the channel typed either way: bare `Error` or `unknown` in `Effect<A, E, R>` erases
the recovery `catchTag` depends on.

```ts
import { BaseError } from '@dxos/errors';

export class HttpError extends BaseError.extend('HttpError', 'HTTP request failed') {
  constructor(context: { readonly status: number }) {
    super({ context });
  }
}
```

**Raise `BaseError` with `Effect.fail`.** `AGENTS.md` teaches
`return yield* new SomeError()`, which needs an error implementing
`Cause.YieldableError`. `Data.Error`, `Data.TaggedError` and `Schema.TaggedError` all
do; `BaseError` is a plain `Error` subclass and does not. DXOS domain errors go
through `Effect.fail(new HttpError({ status: 404 }))`.

**`Effect.fnUntraced` is the default wrapper.** `AGENTS.md` prefers `Effect.fn('name')`
for the span it attaches. This repo leans the other way, running `fnUntraced` roughly
two to one and reserving the traced form for boundaries worth a span. Either beats a
function that returns `Effect.gen`.

## Layer stacks

Composing a layer stack, and test environments above all: read
[layer-composition.md](layer-composition.md). One parameterized factory per
environment, a flat `Layer.empty.pipe(...)`, `provide` for private dependencies
against `provideMerge` for shared ones, and the shared memo map, which hands you the
same instance across two provides in one run with no compile error to warn you.

## Schema, SchemaAST, and pre-migration code

Touching `Schema`, annotations, `toJsonSchema`, or anything under `SchemaAST`: read
[v4-schema.md](v4-schema.md). It carries the rule that `effect/SchemaAST` is imported
only through `@dxos/effect`, the annotation reads that silently return `undefined` on
refined types, `mutableKey` placement, lost brands, and the emitted-JSON-Schema wire
contract.

It also holds a **rename table**. Reach for it when reading an older file, an old PR
or an upstream issue, and when a name you were about to write turns out to have been
replaced.
