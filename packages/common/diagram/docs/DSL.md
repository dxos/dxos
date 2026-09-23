# The diagram DSL

A text form for the scene language in [`src/scene.ts`](../src/scene.ts).

Until now the language has been structural only — Effect Schema, exchanged as JSON. That is fine
for a wire format and hopeless for a source format: a scene in a git diff is a wall of braces in
which a moved box and a rewritten diagram look the same. The DSL exists so a diagram can be
reviewed, hand-edited, and blamed like code.

It is a **serialization of the scene**, not a second graph language. Every construct maps onto one
`WorldObject`, `Element`, or `Command`, and nothing in it computes a layout. The dialects
(`mermaid.ts`, `uml.ts`) remain the way to author a diagram _without_ coordinates; the DSL is what
their output becomes once you want to keep it.

## Example

```diagram
object pkgA @ -24,-24 scale=1 {
  rect frame 0,0 248x172 "Package A" color=grey stroke=dashed
}

object A @ 0,0 {
  rect box 0,0 100x50 "A"
}

object B @ 0,110 {
  rect box 0,0 100x50 "B"
}

object edges @ 0,0 {
  arrow B-A B/box -> A/box head=triangle
}
```

## Surface syntax

Whitespace is insignificant; `{ … }` delimits, not indentation. A `#` preceded by whitespace (or at
the start of a line) begins a comment that runs to the end of the line.

### Statements

A document is a sequence of statements. Each maps onto exactly one `Scene.Command`:

| Statement                            | Command           |
| ------------------------------------ | ----------------- |
| `object <id> <attr>* { <element>* }` | `upsert-object`   |
| `elements <id> { <element>* }`       | `upsert-elements` |
| `move <id> @ <x>,<y>`                | `move-object`     |
| `remove object <id>`                 | `remove-object`   |
| `remove elements <id> <id>+`         | `remove-elements` |

A document whose statements are all `object` is a **scene document** — that is what `print(scene)`
emits, and what a drawing serializes to. The other four exist so an edit can be expressed in the
same language it reads in; an agent that can write a diff instead of a whole scene writes one.

Object attributes are `@ <x>,<y>` for `origin`, plus `scale=`, `index=`, `ref=`. Omitting `@` on an
`upsert-object` leaves the object where it is, exactly as the schema says.

### Elements

`<kind> <id> <geometry> [<label>] <attr>*` — the geometry is positional and kind-specific, the
label is a bare quoted string, and everything else is `name=value`.

| Kind                                  | Geometry                          | Label    |
| ------------------------------------- | --------------------------------- | -------- |
| `rect` `ellipse` `diamond` `triangle` | `<x>,<y> <w>x<h>`                 | optional |
| `circle`                              | `<cx>,<cy> <r>`                   | optional |
| `line` `curve`                        | `<x>,<y> <x>,<y> …` (two or more) | —        |
| `arc`                                 | `<cx>,<cy> <r> <from>..<to>`      | —        |
| `text`                                | `<x>,<y>`                         | required |
| `arrow`                               | `<end> -> <end>`                  | optional |
| `portal`                              | `<x>,<y> <w>x<h>`                 | optional |

Attributes, all optional unless noted: `color` `fill` `stroke` `weight` on every element;
`rotation` and `corners` on the box kinds; `w` (wrap width) on `text`; `closed` on `line`; `head`
and `tail` on `arrow`; `ref` on `portal`, where the schema requires it.

There are no bare flags — `closed=true`, not `closed`. A bare word after an arrow's `->` would be
ambiguous between a ref and a flag, and an LR(1) parser cannot settle it without looking past the
word for an `=`. One form for every attribute is the cheaper rule anyway.

Their values are exactly the schema's literals, so `stroke=dashed` and `head=crowsfoot` are the
whole of the style vocabulary. Bare words are reserved for those literals; every free-text value
(`index`, `ref`, labels, and any id that is not a bare word) is quoted. `solid` means two different
things — a `Fill` and a `Stroke` — which is why the attribute name is never elided.

### Ids and refs

An id is a bare word (`[A-Za-z_][A-Za-z0-9_-]*`) or, when it is not — because it starts with a
digit, contains punctuation, or collides with a keyword — a quoted string. The printer decides;
both parse.

An arrow end is a point (`10,20`), a ref in exactly the spelling `Scene.formatRef` produces
(`element`, `object/element`, either with `#port`), or `_` for an end the schema leaves unset.
`->` is the connector:

```diagram
arrow edge-1 A/box -> B/box#left "extends" head=triangle
arrow edge-2 10,20 -> B/box            # explicit start, bound end
arrow edge-3 A/box -> _                # bound start, renderer picks the end
```

Bound ends are the first of the two things a naive line-based syntax loses — the syntax that writes
an arrow as a pair of coordinates cannot say "track this box when it moves". Writing the omission
as `_` rather than leaving a hole is what keeps the trailing end distinguishable from the
attributes after it; an optional operand there is not LR(1).

`#` is both the port separator and the comment character. `A/box#left` is one token because the
tokenizer takes the longest match; a comment therefore needs whitespace in front of it. This is the
one place the syntax asks the author to remember something.

### Portals

`Portal` is a window onto _another_ drawing — its `ref` is a DXN, not inline containment — so the
text form carries the reference and stops there:

```diagram
object detail @ 400,0 {
  portal inner 0,0 240x160 "Storage layer" ref="dxn:echo:@:01JBXQ2K8Z"
}
```

There is deliberately no inline nested-scene form. Inventing one would not round-trip, because
`scene.ts` has nowhere to put it: a portal names a target, and the target is a separate `Scene`.
Nesting is expressed by two documents and a DXN between them, and the renderer resolves it.

## What the grammar leaves out

- **Layout.** No implicit placement, no `A --> B` that invents coordinates. Every number in a
  document was chosen by whoever (or whatever) wrote it. A diagram you want laid out for you is a
  mermaid source; run it through the converter to get a DSL document back.
- **Expressions and variables.** No arithmetic, no `$width`, no reuse. A scene is data; a
  templating layer over it would defeat the diffability that motivates the format.
- **Comments in the round trip.** Comments parse and are dropped on print, because the model has
  nowhere to hold them. A document that is printed back from a scene is canonical, not preserved.
- **Element ordering semantics.** Paint order is the array order inside an object, and `index`
  between objects, exactly as `scene.ts` defines it. The DSL adds no z-ordering of its own.
- **Unknown attributes.** The grammar accepts any `name=value`; the _linter_ rejects the ones that
  are not in the schema. Keeping the grammar permissive is what lets the error say
  `unknown attribute "colour" on rect` instead of a parse failure three tokens later.

## MDL: sibling grammar, dispatched by the fence

A diagram is expressible inside a `.mdl` document as a fenced block:

````markdown
```diagram
object A @ 0,0 {
  rect box 0,0 100x50 "A"
}
```
````

**The diagram grammar is a sibling of the MDL grammar, not a nesting inside it.** The fence's info
string dispatches to it, through the same `LanguageDescription` mechanism deus already uses for
`mdl` blocks (`packages/reflect/deus/src/extension/language.ts`). Three reasons:

1. **The two languages disagree about what a line is.** MDL's grammar is a map: `FieldName
Optional? ":" TypeExpr?`, newline-terminated, where the terminator is load-bearing — it is how
   the parser tells a type name after a colon from a field name at the start of the next entry. The
   diagram grammar is brace-delimited and whitespace-insensitive, because its elements carry
   positional geometry that reads badly when broken across lines. Merging them means one tokenizer
   holding both token sets, and a newline that is significant in half the tree.

2. **`ext` declares block types, it does not extend the grammar.** An `ext` block gives a block
   type a `uri`, a `desc`, and a `fields` map — the body of every `mdl` block is still the same
   `field: value` shape. Expressing a diagram as an `mdl` block would mean flattening geometry into
   that map, which is the JSON we are trying to get away from. A diagram is a _different_ language
   that a `.mdl` document embeds, which is what a distinct fence tag means.

3. **Error recovery does not survive the merge.** deus deliberately keeps MDL highlighting on a
   regex `ViewPlugin` rather than the LR tree, "so that it is immune to LR error-recovery false
   positives on prose content". MDL blocks contain prose; diagram blocks do not. Two parsers let
   the diagram block have real lezer highlighting and a real linter while MDL keeps its
   prose-tolerant behaviour. One merged parser would have to pick.

The cost is that a `.mdl` document containing diagrams carries two grammars. The mechanism for
that already exists and is one line at the call site — `codeLanguages: [mdlBlockDescription,
diagramBlockDescription]` — and CodeMirror's markdown mode handles the mixed parse. Nothing in
deus changes.

For discoverability from inside MDL, a document may declare the block type the usual way, so a
reader of the spec meets it where they meet every other block type:

```mdl
ext diagram
  uri: org.dxos.mdl.diagram@1.0
  desc: A positioned scene in the diagram DSL; the block body is parsed by the diagram grammar.
  lang: diagram
```

## Layout of the implementation

Mirrors `packages/reflect/deus`, split at the point where CodeMirror enters:

| Path                        | Entry         | Depends on                    |
| --------------------------- | ------------- | ----------------------------- |
| `src/dsl/diagram.grammar`   | —             | generated by `prebuild-lezer` |
| `src/dsl/gen/diagram.ts`    | `.`           | `@lezer/lr`                   |
| `src/dsl/parse.ts`          | `.`           | `@lezer/lr`                   |
| `src/dsl/print.ts`          | `.`           | —                             |
| `src/dsl/convert.ts`        | `.`           | the dialect registry          |
| `src/extension/syntax.ts`   | `./extension` | `@codemirror/language`        |
| `src/extension/language.ts` | `./extension` | `@codemirror/language`        |
| `src/extension/lint.ts`     | `./extension` | `@codemirror/lint`            |
| `src/extension/complete.ts` | `./extension` | `@codemirror/autocomplete`    |

The main entry stays headless because `plugin-illustrator`'s operations import it server-side;
everything that touches an editor lives behind the `./extension` subpath.

## Round trip

`print(parse(text))` is the identity on any canonically-formatted document, and the corpus in
`src/dsl/dsl.test.ts` asserts it — including the `BASIC` fixture from `src/testing.ts` compiled
through `MermaidEngine` and printed, which is the shape the converter emits.

Canonical form: two-space indent, one element per line, a blank line between objects, attributes in
schema field order, numbers as short as `String(n)` makes them, ids bare where they can be.

## The converter

`convert` runs any registered `Dialect` and prints the commands:

```
dialect input → Dialect.compile → Scene.Command[] → printCommands → text
```

so every dialect the registry gains is convertible for free; mermaid is simply the first. The
important decision is that the converter emits the **post-layout** form, because the DSL has no
pre-layout form to emit — it has no unpositioned node. Converting `BASIC` therefore yields the
thirteen objects `MermaidEngine.compile` produces, with the inheritance fan-in already merged into
a bus, its stubs, and one triangle-headed arrow. That is the point: the converter is how you freeze
a generated layout into something you can hand-tune and check in.
