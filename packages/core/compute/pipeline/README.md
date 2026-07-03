# @dxos/pipeline

Generic, back-pressured streaming pipeline. A pipeline runs an Effect `Stream` source through an
ordered chain of stages — each a `Stream → Stream` transform sharing one injected context — and
drains the result to a sink. Back pressure is the default (pull-based `Stream`) and configurable
per pipeline or per stage (`suspend` / `sliding` / `dropping`).

## Usage

```ts
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { EffectEx } from '@dxos/effect';
import { Pipeline, Stage } from '@dxos/pipeline';

await EffectEx.runPromise(
  Pipeline.run({
    source: Stream.fromIterable([1, 2, 3]),
    stages: [Stage.map('double', (n: number) => Effect.succeed(n * 2))],
    sink: (out) => Effect.sync(() => console.log(out)),
    context: {},
  }),
);
```

See [`@dxos/pipeline-email`](../pipeline-email) for a worked pipeline over the Enron email dataset.
