# Diagrams tied to the index

A diagram in code-index is plugin-illustrator's semantic DSL (`.dx`): boxes, typed edges and
groups, laid out by `SemanticEngine`. This note covers how a diagram's boxes and edges connect to
the RDF index they were drawn from, what is built, and what the next steps would take.

## What is built

**A box's `ref` is an IRI.** The DSL's `node … ref="…"` attribute survives layout onto the scene
object (`WorldObject.ref`) and into a `.dx.svg` payload, so it is the one channel that ties a drawn
box to the thing it depicts. The agent puts the IRI a SPARQL row returned there:

```
node echo "@dxos/echo" ref="https://dxos.org/deus/package/@dxos/echo"
```

A `ref` may also be a path or a name (`@dxos/echo`, `src/Store.ts`, `Operation.make`), which
resolve the way the MCP `describe` tool resolves them.

**An IRI that names nothing is rejected.** When `display.diagram` runs, every `ref` under
`https://dxos.org/deus/` must be the subject or object of at least one quad
(`Sandbox.missingRefs`). A hallucinated IRI fails the snippet with the list, so the model fixes it
rather than drawing a box that shows nothing when clicked.

**Edges are checked against the facts.** For each edge whose two boxes carry index IRIs, the sandbox
asks whether any triple links them in either direction (`Sandbox.unbackedEdges`, capped at 80 edges).
`display.diagram` resolves to `{ unbacked }`, the edges with no direct fact behind them. They still
draw, since an edge may summarise a path (a file importing a file through a barrel), but the
model sees which ones to double-check.

**Clicking a box shows the resource.** The web UI's `Describe` RPC runs the MCP `describe` handler
on the box's `ref`, and the panel lists the resolved IRI, its outgoing facts and its incoming
predicate counts under the diagram.

## What the DSL cannot say yet

- **Edges carry no `ref`.** `EDGE_ATTRS` has only `head`, `tail`, `stroke` and `color`, so an edge
  cannot name the predicate it depicts (`deus:declaresDep`, `deus:imports`). The check above
  therefore asks "is there _any_ triple between these two", not "is there _this_ one". Adding
  `ref` to `EDGE_ATTRS`, and carrying it onto the connector element, would let an edge be checked
  exactly (`ASK { <a> deus:declaresDep <b> }`) and clicked like a box.
- **Groups carry no `ref`.** A group often is a resource too (a package framing its files). The
  same one-attribute change to `GROUP_ATTRS` would tie it.

Both are changes to `@dxos/diagram` (`dsl/vocabulary.ts`, `semantic.ts`, the scene emitter), not to
code-index.

## Next steps, in order of value

1. **Diagrams as facts.** Record each displayed diagram in the store: a `deus:Diagram` resource per
   panel, `deus:depicts` to each box's IRI, and (with edge refs) `deus:depictsFact` for each edge's
   predicate and endpoints. SPARQL can then answer "which diagrams show `@dxos/echo`", and a
   diagram becomes something the index knows about rather than a picture beside it.
2. **Staleness.** With diagrams as facts, the indexer's commit of a file can ask which diagrams
   depict a fact that no longer holds: an edge whose `declaresDep` was removed, or a box whose IRI
   is gone. That turns a saved diagram into one that says when it has drifted from the code.
3. **Round trip through Composer.** A `.dx.svg` export already keeps every `ref` in its payload. A
   Composer drawing imported from it keeps the IRIs; resolving them to ECHO objects (or a code-index
   lookup) would let the same diagram be clicked through in either place.
