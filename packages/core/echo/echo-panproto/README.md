# @dxos/echo-panproto

Declarative, serializable lenses between an ECHO object and a foreign (e.g. atproto) record, backed by
[panproto](https://panproto.dev). A lens is **data** — the whole mapping is a `Panproto.Lens` value, not
a hand-written codec.

```ts
import { Panproto } from '@dxos/echo-panproto';

// Register the ECHO-specific codecs a lens references by name (once, from the owning plugin).
Panproto.registerTextFormat('markdown-html', { encode: markdownToHtml, decode: htmlToMarkdown });
Panproto.registerRefType('text', { read: loadTextRef, make: makeTextRef });

const lens: Panproto.Lens = {
  adapters: [
    { kind: 'scalar', wire: 'title', echo: ['catalog', 'title'] },
    { kind: 'array', wire: 'authors', echo: ['catalog', 'authors'], separator: '\t' },
    { kind: 'prefix', wire: 'status', echo: ['status'], prefix: 'buzz.bookhive.defs#' },
    { kind: 'ref', wire: 'review', echo: ['review'], ref: { refType: 'text', format: 'markdown-html' } },
  ],
};

const record = await Panproto.encode(book, lens); // ECHO object -> wire record
const fields = await Panproto.decode(record, lens); // wire record -> ECHO-shaped fields
```

## Two parts: engine (`migration`) + runner (`adapters`)

A `Lens` has two parts, run by `Panproto.encode`/`decode`:

- **`migration` — panproto (structural).** Cross-lexicon vertex/edge alignment: field renames and
  nesting between two atproto lexicons, executed by the panproto engine (`liftJson`). This is what the
  wasm on the `./wasm` entrypoint runs.
- **`adapters` — the runner (ECHO effects).** The value-level and ECHO-specific work panproto's graph
  transform cannot express: `Ref<Text>` resolution, array↔string, object metadata (`createdAt`), scalar
  value coercions (knownValue prefix, date widen), and nested structs. Authored as data; executed
  host-side. Any structural move can shift between `migration` and `adapters` with no consumer change.

## Entrypoint split

- **`@dxos/echo-panproto`** — the durable `Panproto` API (the `Lens` schema, the `encode`/`decode`
  runner, `registerTextFormat`/`registerRefType`). Depends on `@dxos/echo`; the `Lens` schema itself is a
  side-effect-free leaf, so importing it does not load the engine.
- **`@dxos/echo-panproto/wasm`** — the engine. Wraps upstream `@panproto/core` (which ships and loads its
  own wasm) and is loaded lazily by the runner, so the API surface never statically depends on it. This is
  the one swappable implementation detail.

## panproto engine

The engine bridges to upstream **`@panproto/core@0.56.1`**, whose high-level TypeScript API executes
migrations at runtime: `Panproto.init()` → `panproto.parseLexicon(lexicon)` →
`panproto.migration(src, tgt).map().mapEdge().compile()` → `mig.liftJson(record, rootVertex)`. See the
panproto book (https://panproto.dev/book) — verified against `reference/sdk-typescript.html` and the
`tutorials/`. panproto's structural graph transforms are used for `migration`; scalar value transforms and
ECHO effects are the runner's `adapters` (the shipped API exposes structural lens-DSL steps but no
value-expression step).
