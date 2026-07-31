# @dxos/pipeline

Generic, back-pressured streaming pipeline. A pipeline runs an Effect `Stream` source through an
ordered chain of stages — each a pipeable `Stream → Stream` transform, composed with `pipe` — and
drains the result to a sink. Back pressure is the default (pull-based `Stream`) and configurable
per pipeline or per stage (`suspend` / `sliding` / `dropping`). Shared dependencies flow through
Effect's Requirements channel (`Context.Tag` / `Layer`), provided once at the edge.

## Usage

```ts
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { EffectEx } from '@dxos/effect';
import { Pipeline, Stage } from '@dxos/pipeline';

await EffectEx.runPromise(
  Stream.fromIterable([1, 2, 3]).pipe(
    Stage.map('double', (n: number) => Effect.succeed(n * 2)),
    Pipeline.run({ sink: (out) => Effect.sync(() => console.log(out)) }),
  ),
);
```

Shared dependencies flow through Effect's Requirements channel rather than an explicit `context`
parameter — a stage reads them with `yield*` inside its `Effect.gen`, and the caller provides them
once at the edge:

```ts
class Factor extends Context.Tag('Factor')<Factor, { readonly factor: number }>() {}

const program = source.pipe(
  Stage.map('scale', (n: number) => Factor.pipe(Effect.map(({ factor }) => n * factor))),
  Pipeline.run({ sink }),
);

await EffectEx.runPromise(Effect.provide(program, Layer.succeed(Factor, { factor: 5 })));
```

See [`@dxos/pipeline-email`](../pipeline-email) for a worked pipeline over the Enron email dataset.
