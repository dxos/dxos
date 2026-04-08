# DEUS EX MACHINA

```
________  _______________ ___  _________
\______ \ \_   _____/    |   \/   _____/
 |    |  \ |    __)_|    |   /\_____  \
 |    `   \|        \    |  / /        \
/_______  /_______  /______/ /_______  /
        \/        \/                 \/
```

> A pattern specification language for human-agent collaborative software development.

> "To work our way towards a shared language once again, we must first learn how to discover patterns which are deep, and capable of generating life."
> — Christopher Alexander, The Timeless Way of Building

> "No pattern is an isolated entity. Each pattern can exist in the world, only to the extent that is supported by other patterns: the larger patterns in which it is embedded, the patterns of the same size that surround it, and the smaller patterns which are embedded in it."
> — Christopher Alexander, A Pattern Language

> "Each pattern describes a problem which occurs over and over again in our environment, and then describes the core of the solution to that problem, in such a way that you can use this solution a million times over, without ever doing it the same way twice."
> — Christopher Alexander, A Pattern Language

## Overview

Deus is a semi-formal, human-readable specification language for software systems.
A `.mdl` file is the authoritative description of a system — its types, behaviour,
interfaces, and acceptance criteria — from which implementation, tests, and documentation
can all be derived.

The language is built around a single primitive (`ext`) and a universal extension
mechanism. The standard vocabulary (`type`, `op`, `component`, `service`, `feat`, `test`)
is itself defined using that mechanism, and any project can introduce new constructs
the same way.

Deus is designed for a world where humans and agents collaborate: the human describes
intent in natural language, Deus captures it precisely enough for an agent to design,
implement, and verify — then proposes amendments when reality drifts from the spec.

## Motivation

Software specifications exist on a spectrum. At one end: dense prose documents that
humans can read but agents cannot act on. At the other: formal languages that machines
can verify but no one wants to write. In practice most teams have neither — intent
lives in tickets, Slack threads, and the author's head.

Deus occupies the middle ground: compact, structured, and readable without being
a proof system. It is precise enough to drive agents, loose enough to evolve with
the project, and human enough to serve as the shared language a team actually uses.

The name resonates with its purpose: _deus ex machina_ — the authoritative source
from which the machine derives everything else.

## Design Principles

**Prose-first, structure on demand.**
Simple requirements stay as prose. Complex ones get `when/then`. The language
never forces ceremony on things that don't need it.

**One primitive, infinite vocabulary.**
The only built-in construct is `ext`. Everything else — types, operations,
components, features, tests — is declared using `ext`. Users and agents extend
the language the same way the standard dialect is built.

**Layers, not monoliths.**
Specs compose via `extends`. A DXOS plugin spec extends `Deus.DXOS`, which
extends `Deus.Std`, which extends `Deus.Core`. Each layer adds vocabulary;
no layer breaks the ones above it.

**Structural and behavioural concerns are separate.**
Structural blocks (`type`, `op`, `component`, `service`) describe _what exists_.
Behavioural blocks (`feat`, `req`) describe _how things behave_. Tests validate both.
Features are the glue — they cross-reference structural elements explicitly.

**Pure before effectful.**
Operations declare whether they are pure (no `effects`, no `requires`) or effectful.
This distinction surfaces in the spec, not just in the code.

**The spec is the source of truth.**
Round-trip tooling keeps implementation and spec in sync. Agents read the spec
to implement; they read the code to propose spec amendments.

## Core Language

### Document Format

A `.mdl` file has three parts:

1. **Frontmatter** — YAML delimited by `---`. Contains document metadata.
2. **Body** — Standard Markdown prose, headings, and lists.
3. **Blocks** — Typed fenced sections carrying structured declarations.

```
---
id:        URI           # globally unique document identifier
name:      Identifier    # human-readable name
version:   SemVer
extends?:  URI[]         # specs this document extends (transitive)
---
```

A block is a fenced section with a declared type, optional identifier, and optional title:

````
```<type> [<id>][: <title>]
  key: value
  key?: TypeExpr
  key: a | b | c
````

```

### The `ext` Primitive

`ext` is the only block type the core language provides. It is self-describing:

```

```ext ext
  uri: deus.org/core/ext
  desc: Declares a new block type or extends an existing one.
  fields:
    uri:           URI
    desc:          Prose
    extends?:      ExtRef
    fields?:       FieldMap
    adds-fields?:  FieldMap
    nesting?:      self | none
    inline-prose?: Boolean
    example?:      CodeBlock
```

```

### Primitive Types

The meta-vocabulary used within `ext` field declarations:

| Type        | Description                                          |
|-------------|------------------------------------------------------|
| `Prose`     | Free-form text, single or multi-line                 |
| `Identifier`| Alphanumeric name, hyphens allowed                   |
| `URI`       | Dot-path or URL identifier                           |
| `SemVer`    | Semantic version string                              |
| `Boolean`   | `true` or `false`                                    |
| `TypeExpr`  | Type reference or inline type — e.g. `Color`, `Piece?` |
| `FieldMap`  | Named fields: `name[?]: TypeExpr  # comment`         |
| `UnionList` | Pipe-separated variants: `a \| b \| c`               |
| `ProseList` | Bulleted list of prose items                         |
| `CodeBlock` | Literal indented or fenced text                      |
| `ExtRef`    | Reference to a declared extension name               |
| `TagList`   | Space or comma-separated tag identifiers             |

### Cross-References

Any declared block identifier may be referenced elsewhere as `[<id>]`.
Blocks in other layers may be referenced with a type prefix: `op:submitMove`,
`component:Gameboard`. The linter verifies all references resolve.

### Resolution Rules

1. A block type must appear in the document's Extensions table or an ancestor's.
2. If the URI matches an inline `ext` in an Appendix, that definition is used.
3. Otherwise the URI is resolved from an external registry.
4. Unresolvable block types are lint errors. Unknown fields are lint warnings.

## Extension Mechanism

### Declaring Extensions

Every document lists its vocabulary upfront in an Extensions table:

```

## Extensions

| Term        | URI                        |
| ----------- | -------------------------- |
| `type`      | deus.org/std/type@1.0      |
| `component` | deus.org/std/component@1.0 |

```

This is the manifest — agents know which dialects apply before reading the body.

### Defining Extensions

Extensions are defined with `ext` blocks, either inline in the Appendix
or in a shared `.mdl` file referenced by URI:

```

```ext component
  uri: deus.org/std/component@1.0
  desc: A UI component with props, state, slots, actions, and events.
  fields:
    props?:   FieldMap
    state?:   FieldMap
    slots?:   FieldMap
    actions?: ActionMap
    emits?:   EventMap
    layout?:  CodeBlock
```

```

### Extending Extensions

An extension may extend another, inheriting all its fields:

```

```ext echo-type
  uri: deus.org/dxos/echo-type@1.0
  extends: type
  adds-fields:
    echo-schema: TypeExpr
    space?:      SpaceRef
```

```

### Extension Inheritance

Specs compose via `extends` in frontmatter. The extension chain is transitive:
`Deus.DXOS` extends `Deus.Std` extends `Deus.Core`. A document inheriting
`Deus.DXOS` can use all constructs from all three layers without re-declaring them.

## Standard Dialect (Deus.Std)

The standard dialect defines the common vocabulary for software specifications.
All constructs are `ext` declarations — there is no privileged status.

### type

A named data structure with typed fields, variants, and invariants.

```

```type Color
  variants: white | black
```

```type Board
  fields:
    squares: Square[8][8]
    turn:    Color
    status:  playing | check | checkmate | stalemate
```

```

### op

A named operation with typed inputs, outputs, and declared errors.
Operations are either **pure** (no `effects`, no `requires`) or **effectful**.
This distinction maps directly to Effect-TS's `Effect<A, E, R>`.

```

````op validateMove          # pure
  input:  { board: Board, move: Move }
  output: Move
  errors: { IllegalMove, WrongTurn, GameOver }
  requires: [ChessEngine]

```op submitMove            # effectful
  input:  { game: Game, player: Player, move: Move }
  output: Game
  errors: { WrongTurn, IllegalMove, GameOver }
  effects: [echo:write]
  requires: [ChessEngine, GameStore]
````

```

### feat / req

Features group requirements. Requirements are atomic behavioural constraints,
written as prose or structured `when/then` blocks.

```

```feat F-2: Make Move
  req F-2.1:
    when: player submits a Move on their turn
    then: Move validated; Board updated; turn advances
    errors: [InvalidMove, WrongTurn]
```

```

### test

Acceptance scenarios expressed as given / when / then steps.
Tests serve as both human-readable criteria and agent-executable verification targets.

```

```test T-6: Submit valid move
  given: active game, white's turn
  when: white submits pawn e2→e4
  then:
    - Board updated, e4 occupied
    - Game.board.turn === black
    - Game persisted to ECHO
```

```

### component

A UI component with props, internal state, named slots, actions, and emitted events.
Slots follow the `SlottableProps` pattern — named `ReactNode` injection points.

```

```component Gameboard
  props:   { game: Game, playerId: string }
  state:   { selected?: Square, highlights: Square[] }
  slots:   { toolbar?: ReactNode, overlay?: ReactNode }
  actions: { selectSquare(square: Square), submitMove(move: Move) }
  emits:   { onMove(move: Move), onResign() }
```

```

### service

An external or system-level dependency. Services are injected into `op` blocks
via `requires`. They may be local (WASM), remote (HTTP), or platform-provided (ECHO).

```

```service ChessEngine
  loading: lazy
  ops:
    validate(board: Board, move: Move) → Move
    legalMoves(board: Board, square: Square) → Square[]
```

```

### db

A persistence layer — schema, queries, and backend. In DXOS contexts the
backend is typically ECHO; the construct is general enough for SQL or any store.

## Domain Dialects

### Deus.DXOS

Extends `Deus.Std` with DXOS-specific constructs:

- **`echo-type`** — extends `type` with `echo-schema` and `space` fields
- **`composer-plugin`** — extends `service` with `surfaces` and `echo-types`
- **`effect-op`** — extends `op` with full Effect-TS dependency injection semantics

## Round-Trip Development

### Spec → Implementation

The `.mdl` file is the briefing an agent receives before writing code.
Structural blocks (`type`, `op`, `service`) map to TypeScript interfaces,
Effect functions, and service contracts. Behavioural blocks (`feat`, `req`)
are implementation constraints. Tests become vitest acceptance tests.

### Implementation → Spec

When an agent modifies code, it compares the implementation against the spec
and proposes amendments as diffs to the `.mdl` file. This closes the loop:
the spec never goes stale, and drift is surfaced as a reviewable change.

### Acceptance Criteria

`test` blocks are the contract between spec and verification. An agent
implementing a feature marks it complete only when the corresponding tests pass.
Tests can also be rendered as user-facing acceptance criteria for review.

## Tooling

### Linter

A linter validates `.mdl` files against the declared extension schemas:

- Unknown block types → error
- Missing required fields → error
- Unresolved cross-references → error
- Unknown fields → warning
- Missing `test` coverage for `feat` blocks → warning

### Renderers

A `.mdl` file can be rendered into multiple output formats:

- **FRS document** — structured Markdown requirements doc (like `FRS.md`)
- **Test stubs** — vitest `describe`/`test` scaffolding from `test` blocks
- **Type stubs** — TypeScript interfaces from `type` blocks
- **Ticket list** — `feat`/`req` blocks as linear/GitHub issues

### CodeMirror Extension

The primary editor integration targets CodeMirror 6 (used inside the Composer plugin):

- **Lezer grammar** — parses block headers, body key-value pairs, type expressions
- **Syntax highlighting** — block type, identifier, field keys, type expressions
- **Lint integration** — inline errors and warnings from the linter
- **Completion** — field names and value enums from `ext` definitions
- **Hover** — shows the `ext` definition for any block type

DXOS already uses Lezer for the `echo-query` grammar; the same toolchain applies.

### Composer Plugin

A dedicated Composer plugin provides a split editor/preview for `.mdl` files,
with the CodeMirror extension for editing and a rendered FRS view alongside.

## Examples

The chess plugin trilogy demonstrates incremental spec evolution:

| File | New Extensions | What It Introduces |
|------|---------------|-------------------|
| `chess-1.mdl` | `type`, `feat`, `test` | Data model, game rules, acceptance criteria |
| `chess-2.mdl` | `component` | Lobby and Gameboard UI components |
| `chess-3.mdl` | `op`, `service` | Move validation, game persistence, chess engine |

See also `FRS.spec` in `plugin-spacetime` for a full real-world example.

## Open Questions

- **`req` as standalone block vs. inline-only** — should requirements be
  first-class blocks (addressable by ID anywhere) or only valid inside `feat`?
- **`db` vs `service`** — is a database just a service with a specific shape,
  or does persistence deserve its own construct?
- **Registry** — what does the URI resolution registry look like in practice?
  A JSON index? A git repo of `.mdl` files?
- **Versioning** — how are breaking changes to an extension handled?
  Can a doc pin `type@1.0` while a sibling uses `type@2.0`?
- **Agent contract** — what is the precise interface between a Deus spec
  and an implementing agent? A system prompt template? A tool schema?

## Appendix

See `core.mdl` for the formal definition of the core language and primitive types.
See `examples/` for the chess trilogy and the spacetime plugin spec.
```
