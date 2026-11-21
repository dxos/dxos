# @dxos/echo-memory

## 0.17.0

### Minor Changes

- 3585abc: `@dxos/echo-memory` no longer depends on `n3`. Its RDF/JS terms and data factory are the new `Rdf` module and TriG is written by the new `Trig` module, so the memory core loads under workerd's `nodejs_compat`, where n3's `readable-stream` does not.

  **Breaking:** `Mapping.factToTriples`, `Ontology.toQuads` and `Ontology.ontologyQuads` now return standard `@rdfjs/types` terms instead of n3 terms. Callers that used n3-only methods such as `toJSON()` should read the RDF/JS fields (`termType`, `value`, `subject`, `predicate`, `object`, `graph`) instead. Functions that take terms still accept n3's, which satisfy the same interfaces.

  TriG output matches n3's writer, including base direction (`@ar--rtl`), with these differences:

  - An absolute IRI that only looks like a prefixed name (such as `ex:Post`) stays in angle brackets, so it reads back as the same IRI.
  - `Trig.write` throws on a quoted triple or a variable instead of writing it, where n3 writes RDF-star or a blank node.

### Patch Changes

- Updated dependencies [3aef671]
- Updated dependencies [768db81]
  - @dxos/keys@0.17.0
  - @dxos/errors@0.17.0
