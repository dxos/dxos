---
name: effect
description: DXOS conventions for Effect 4: the pinned-source lookup order, BaseError in the error channel, layer stack composition, and Schema/SchemaAST rules. Use when writing or changing Effect code, defining services or layers, composing test layer stacks, working with Schema or SchemaAST, or reading pre-migration v3 code.
---

# Effect 4 in DXOS

Your Effect knowledge is v3. This repo is on a v4 release candidate, where services,
errors, Schema, and the AST all moved. v3 written here is **compile-clean and
test-silent**: it typechecks, the tests pass, and the behaviour is wrong.

So do not write Effect from memory. Read the **pinned** copy.

## The pinned copy

Unlike nearly every other package, `effect` publishes its TypeScript source and its
own agent documentation to npm, matched to the exact version this repo compiles
against. Its `files` field ships `src/**/*.ts`, `AGENTS.md`, and `ai-docs/**`, so
this is real source on disk, not `dist`:

| Path                                 | What it holds                                                                                                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `node_modules/effect/AGENTS.md`      | The Effect team's authoring guide, 380 lines                                                                                                                                   |
| `node_modules/effect/ai-docs/src/**` | 48 compiling examples, one per topic, linked from `AGENTS.md`                                                                                                                  |
| `node_modules/effect/src/**`         | 436 files of implementation, JSDoc and every export, including the whole `unstable/` tree where v4 keeps `sql`, `http`, `httpapi`, `cli`, `ai`, `cluster`, and `observability` |

Prefer these over effect.website, over an `effect-smol` checkout, and over recall.
The website tracks `main`; the pinned copy tracks what you compile against.

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
was confirmed by grep in `node_modules/effect/src/`. An API you recalled and did not
confirm is the one that will be wrong.

## Where DXOS diverges from the pinned guide

Three rules where following `AGENTS.md` literally produces broken or off-convention
code. Everything else in it applies as written.

**Domain errors are `BaseError.extend`, not `Schema.TaggedError`.** `BaseError` from
`@dxos/errors` supplies a `_tag` getter, so `Effect.catchTag` still discriminates,
and it carries `context`, `wrap`, and `is` that the rest of the stack expects.

```ts
import { BaseError } from '@dxos/errors';

export class HttpError extends BaseError.extend('HttpError', 'HTTP request failed') {
  constructor(context: { readonly status: number }) {
    super({ context });
  }
}
```

**Raise with `Effect.fail`, not `return yield*`.** `AGENTS.md` teaches
`return yield* new SomeError()`, which needs the error to be yieldable. `BaseError`
extends `Error` and is not, so `Effect.fail(new HttpError({ status: 404 }))` is the
form here. `return yield*` works only for the few `Schema.TaggedError` classes.

**`Effect.fnUntraced` is the default wrapper.** `AGENTS.md` prefers `Effect.fn('name')`
for the span it attaches. This repo leans the other way, running `fnUntraced` roughly
two to one and reserving the traced form for boundaries worth a span. Either beats a
function that returns `Effect.gen`.

Keep the error channel typed. Bare `Error` or `unknown` in `Effect<A, E, R>` erases
the recovery that `catchTag` depends on.

## Layer stacks

Composing a layer stack, and test environments above all: read
[layer-composition.md](layer-composition.md). One parameterized factory per
environment, a flat `Layer.empty.pipe(...)`, `provide` for private dependencies
against `provideMerge` for shared ones, and v4's shared memo map, which hands you the
same instance across two provides in one run with no compile error to warn you.

## Schema, SchemaAST, and reading v3 code

Touching `Schema`, annotations, `toJsonSchema`, or anything under `SchemaAST`: read
[v4-schema.md](v4-schema.md). It carries the rule that `effect/SchemaAST` is imported
only through `@dxos/effect`, the annotation reads that silently return `undefined` on
refined types, `mutableKey` placement, lost brands, and the emitted-JSON-Schema wire
contract.

It also holds the **v3 to v4 name map**. Reach for that table when reading
pre-migration code, an old PR, or an upstream issue, and when a v3 name you were about
to write needs its v4 replacement.
