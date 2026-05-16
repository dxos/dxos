# reflect

The two halves of the agentic loop: a language for declaring what *should*
exist, and a tool for reading what *does* exist.

| Package | Direction | Source of truth | Surface |
| --- | --- | --- | --- |
| [`@dxos/deus`](./deus) | Top-down: *what should exist* | `.mdl` documents (author intent) | Language, dialects, grammar, CodeMirror extension |
| [`@dxos/introspect`](./introspect) | Bottom-up: *what does exist* | TypeScript source in the monorepo | Package / symbol / plugin / schema / idiom catalog |
| [`@dxos/introspect-mcp`](./introspect-mcp) | — | — | MCP server exposing the introspect catalog (stdio + HTTP) |
| [`@dxos/introspect-tools`](./introspect-tools) | — | — | Browser-safe tool definitions shared with UI consumers |

## How they fit together

```text
        .mdl spec  ──read──▶  agent  ──writes──▶  TypeScript
                                ▲                       │
                                │                       │
                          reconcile                   index
                                │                       │
                                └─────  introspect  ◀───┘
```

1. **Author** writes a `.mdl` document in Deus — types, operations, components,
   features, tests.
2. **Agent** reads the spec and generates TypeScript that satisfies it.
3. **Introspect** indexes the live code: every package, every exported symbol,
   every plugin, every JSDoc-tagged idiom.
4. **Agent** reconciles the two — proposes spec amendments when reality drifts,
   suggests new code when the spec moves first. The MCP server is how the agent
   reaches the index.

Neither package imports the other at runtime. Deus is a language; introspect is
a reflective query layer. They meet inside the agent (and inside plugins like
`@dxos/plugin-code` that consume both).

## Idioms

Patterns the codebase has already settled on — named, canonical, and grounded
in real compiling artifacts. Idioms are an introspect concern: the scanner
harvests `@idiom` JSDoc tags from stories, tests, and exported symbols and
serves them via MCP. Deus does not define them.

See [`deus/docs/IDIOMS.md`](./deus/docs/IDIOMS.md) for the format.
