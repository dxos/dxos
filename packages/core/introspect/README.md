# @dxos/introspect

Indexes packages and exported symbols across the DXOS monorepo. 
Pure data results — adapters (MCP, Composer plugin) sit on top.

## Development

To build the index:

```bash
moon run introspect:index
# OR
pnpm exec tsx --conditions=source packages/core/introspect/scripts/build-index.ts
```

## Indexing strategy

1. **Package walking** — `moon query projects` is tried first; falls back to globbing `packages/**/package.json`. The Moon path is gated on `<root>/.moon/` existing so callers running against fixture trees don't accidentally pick up a parent monorepo's project graph.
2. **Symbol extraction** — per-package ts-morph `Project`, parsing the package's resolved entry point (`exports['.'].source` → `types` → `main` → `src/index.ts`). Top-level exports become symbol records with kind, signature, JSDoc, location, and source text.
3. **Lazy** — symbol extraction runs on first query that needs it, then caches per-package.

See [DESIGN-NOTES.md](./DESIGN-NOTES.md) for what was learned reading the codebase, performance notes, and open questions surfaced for later phases.
