# Legacy

Files nothing in the package builds, tests or runs any more, kept for the record (D178). Each one
still works from here, but no CI job or script depends on it, and it is not kept up to date.

| File | What it was for |
| --- | --- |
| `scripts/sort-bench.mjs` | The sorting case study in [IMMUTABILITY.md](../docs/IMMUTABILITY.md) (D83, D96): times `examples/sorting.deus` on the TypeScript kernel, the Rust kernel and wasm. |
| `scripts/analytics-ci.mjs` | The one-off backfill of `CiRun` events from a pull request's check runs (D103); events are now pushed through the Worker (D169). |
| `platform/spec.deus` | The first copy of the spec checker (D92, D94); the live one is the [`Spec`](https://deus.dmytro-a80.workers.dev/#n:Spec) namespace in the codebase, which has moved on (D157, D160). |
| `examples/composer/autocue/deus-plugin.mjs` | The Autocue flow that recorded the Composer plugin demo (D102). |

The codebase export that used to live in `codebase/` is gone rather than kept here: the codebase is
the primary copy and github.com/dxos/deus-mirror its hourly backup (D177).
