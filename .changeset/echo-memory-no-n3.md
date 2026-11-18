---
'@dxos/echo': minor
---

`@dxos/echo-memory` no longer depends on `n3`. Its RDF/JS terms and data factory are the new `Rdf` module and TriG is written by the new `Trig` module, so the memory core loads under workerd's `nodejs_compat`, where n3's `readable-stream` does not.

**Breaking:** `Mapping.factToTriples`, `Ontology.toQuads` and `Ontology.ontologyQuads` now return standard `@rdfjs/types` terms instead of n3 terms. Callers that used n3-only methods such as `toJSON()` should read the RDF/JS fields (`termType`, `value`, `subject`, `predicate`, `object`, `graph`) instead. Functions that take terms still accept n3's, which satisfy the same interfaces.

TriG output is unchanged except in two edge cases: an absolute IRI that only looks like a prefixed name (such as `ex:Post`) now stays in angle brackets so it reads back as the same IRI, and a language-tagged literal keeps its base direction (`@ar--rtl`).
