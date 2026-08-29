# @dxos/ui-template

Layout templates: a framework-agnostic model, an XML surface syntax, and a pluggable renderer.

**Status: spike.** The question under test is whether a template can describe real UI without
procedural logic, and render through more than one framework. Only React is implemented; the
renderer contract is the part that has to earn the "pluggable" claim. Findings and the system
design (registry, operations, machines, published state, undo, plugin composition) →
[`docs/DESIGN.md`](./docs/DESIGN.md).

Vocabulary comes from [`react-ui/docs/ONTOLOGY.md`](../react-ui/docs/ONTOLOGY.md) — kind tags from
§1, binding types from §3, and the rules in §5 (cited below as `R-n`).

## Shape

```
authoring          model            renderer
─────────          ─────            ────────
XML  ──parse──▶  Node tree  ──render──▶  React
                 (plain data)            (Solid, Lit …)
```

`src/model.ts` must never import a UI framework. That constraint is the experiment (`R-6`, `R-13`):
if the model needs React, the result is negative and we have learned it cheaply.

## Grammar

```
template  ::= element                        (exactly one root)
element   ::= '<' tag attr* ( '/>' | '>' element* '</' tag '>' )
tag       ::= 'container' | 'layout' | 'display' | 'control' | 'collection' | 'command'
attr      ::= aspect | data | item | event
aspect    ::= NAME '=' STRING               static; narrowed to number/boolean where it parses
data      ::= 'data-' NAME '=' PATH         read binding against the state object
item      ::= 'item-' NAME '=' PATH         read binding against the current collection item
event     ::= 'on-' NAME '=' OPERATION_KEY  the single outbound edge
PATH      ::= NAME ( '.' NAME )* | '.'      '.' is the item itself
```

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

### Scope

`collection` is the only kind that introduces a scope. It resolves `data-items` to an array and
renders its children once per element, with `item-*` bindings resolving against that element.
Every other kind passes its scope through unchanged.

That single rule is what keeps the model free of an expression language: there is nothing to
evaluate, only paths to walk.

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

- **Per-instance UI state** (`R-4`) — a selected tab has no binding family. The story holds it in
  React state, outside the template.
- **Sub-discriminators** (`R-9`) — six kinds cannot distinguish a tab bar from a breadcrumb.
- **Parts** (`R-10`) — `<control as="button">` is standing in for an action part that does not
  exist in the vocabulary.
- **Async bindings and `absent`** (`R-2`) — the state object here is plain data; nothing resolves a
  `ref` or a `query` yet.
- **Layout escape hatches** (`R-14`) — no way to say "not that way, it breaks".
