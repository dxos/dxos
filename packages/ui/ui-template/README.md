# @dxos/ui-template

Layout templates: a framework-agnostic model, an XML surface syntax, and a pluggable renderer.

**Status: spike.** The question under test is whether a template can describe real UI without
procedural logic, and render through more than one framework. Only React is implemented; the
renderer contract is the part that has to earn the "pluggable" claim. Findings and the system
design (registry, operations, machines, published state, undo, plugin composition) →
[`docs/DESIGN.md`](./docs/DESIGN.md).

Vocabulary comes from [`docs/ONTOLOGY.md`](./docs/ONTOLOGY.md) — kind tags from
§1, binding types from §3, and the rules in §5 (cited below as `R-n`).

## Shape

```text
authoring          model            renderer
─────────          ─────            ────────
XML  ──parse──▶  Node tree  ──render──▶  React
                 (plain data)            (Solid, Lit …)
```

`src/model.ts` must never import a UI framework. That constraint is the experiment (`R-6`, `R-13`):
if the model needs React, the result is negative and we have learned it cheaply.

## Grammar

```text
template  ::= element                        (exactly one root)
element   ::= '<' tag attr* ( '/>' | '>' element* '</' tag '>' )
tag       ::= 'container' | 'layout' | 'display' | 'control' | 'collection' | 'command'
            | 'form' | 'combobox' | 'tabs' | 'tab'
            | 'show' | 'fallback' | 'switch' | 'match' | 'let'
attr      ::= aspect | data | item | event
aspect    ::= NAME '=' STRING               static; narrowed to number/boolean where it parses
data      ::= 'data-' NAME '=' PATH         read binding against the state object
item      ::= 'item-' NAME '=' PATH         read binding against the current collection item
event     ::= 'on-' NAME '=' OPERATION_KEY  the single outbound edge
PATH      ::= NAME ( '.' NAME )* | '.'      '.' is the item itself
```

Two intrinsic binding attributes lack the `data-` prefix but are state bindings all the same:
`when` on `show` and `on` on `switch`.

Text content is not part of the grammar. A bound string is a `display` node with a binding, never a
text child — so there is nothing to interpolate and no expression language to evaluate.

**Hyphens, not colons.** `on:activate` is an XML namespace prefix and a real editor rejects it as
unbound. Since the reason to use XML at all is free editor and schema tooling, a grammar those
tools reject has given up its only advantage (`R-15`).

### Attribute families

| Family    | Prefix   | Resolves against              | Direction |
| --------- | -------- | ----------------------------- | --------- |
| Aspect    | *(none)* | nothing — static              | —         |
| Data      | `data-`  | the template's state object   | in        |
| Item      | `item-`  | the current `collection` item | in        |
| Event     | `on-`    | an operation key              | **out**   |

Only `on-*` writes (`R-3`). Everything else is read-only from the template's point of view, which
means a template can be statically audited for what it can change: the set of operation keys it
names.

### Conditional rendering

`show`/`fallback` and `switch`/`match` are structural, expression-free conditionality:

- `<show when="selected">` renders its children while the resolved `when` binding is present
  (anything except `undefined`/`null`/`false`); otherwise it renders the children of its single
  optional `<fallback>` child. `fallback` is only valid inside `show`.
- `<switch on="view">` renders the children of the `<match value="…">` whose `value` strictly
  equals the resolved `on` binding. `switch` children must be `match`.

Unmatched branches are not hidden — they are never rendered. Which children exist is a function of
one resolved binding, so the grammar still holds no expressions.

### Lexical scopes

Any element that declares `id="x"` opens a named scope for its subtree. Its direct
`<let name="n" machine="org.dxos.machine.…" />` children declare writable slots, seeded from the
named machine's initial value and published at `ui.<idPath>.<n>` — where `idPath` is the chain of
enclosing scope ids. Publication requires the name; anonymous elements have no published state.

Binding resolution is lexical: the first path segment of a state binding is looked up through the
enclosing scopes, innermost first — a frame declaring that name resolves from its slot's value —
before falling back to the root state object, so app-level context (`organizations`, `title`,
`selected`) needs no declaration. Operations are scope-relative: a dispatched handler receives a
`scope` with `has`/`get`/`set` that resolve slot names the same way and write into the published
tree; setting an undeclared name is an error.

`collection` additionally introduces an item scope: it resolves `data-items` to an array and
renders its children once per element, with `item-*` bindings resolving against that element.

Paths to walk, slots to name — still no expression language to evaluate.

## Example

```xml
<container gap="sm">
  <display variant="title" data-text="title" />
  <control label="Name" data-value="title" on-commit="org.dxos.operation.projects.rename" />
  <collection data-items="tags">
    <display item-text="." />
  </collection>
  <command>
    <control as="button" label="Add tag" on-activate="org.dxos.operation.projects.addTag" />
  </command>
</container>
```

Bound to `{ title: string; description: string; tags: string[] }`.

## Typed bindings

A template is parameterized by the type of the state it binds to (`R-1`). `select<State>()` returns
a proxy that records property access, so a path is both a real value and a compile error when the
field does not exist:

```ts
const path = select<ProjectState>().title;   // ok
const bad = select<ProjectState>().missing;  // type error
```

This is what a generic template parameter buys that a string attribute cannot. The XML surface
cannot use it — its paths are strings checked at parse time — which is the sharpest argument for a
TSX authoring surface over XML.

## Errors

An unknown tag is an error with its position, never a dropped element (`R-8`): a silently dropped
element renders as though the author never wrote it. The parser also rejects unbalanced tags,
multiple roots, text content, and an `on-*` value that does not look like an operation key.

## Not implemented

Deliberate gaps, each tracked as a rule in the ontology:

- ~~**Per-instance UI state** (`R-4`)~~ — answered by published state: an `id`-scoped element's
  `let` slots seed from registry machines at `ui.<idPath>.<name>`, written only by scope-relative
  operations (see `docs/DESIGN.md`).
- **Sub-discriminators** (`R-9`) — six kinds cannot distinguish a tab bar from a breadcrumb.
- **Parts** (`R-10`) — `<control as="button">` is standing in for an action part that does not
  exist in the vocabulary.
- **Async bindings** (`R-2`) — `show`/`fallback` covers the absent state structurally, but the
  state object here is plain data; nothing resolves a `ref` or a `query` yet.
- **Layout escape hatches** (`R-14`) — no way to say "not that way, it breaks".
