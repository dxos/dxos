---
'@dxos/datalog': minor
---

Add `@dxos/datalog`, a dependency-free Datalog engine (parser, static checks, incremental stratified semi-naive evaluation with provenance, aggregates and pluggable built-ins) that runs in the browser, workerd and Node, and `@dxos/brain`, which encodes `FactTuple`s (losslessly mapped to pipeline-rdf `Fact`s) as Datalog relations and evaluates compiled goal rules: canonical-vocabulary shorthand, the `about` / `concerns` / time built-ins, and wakes on new bindings, first achievement and sub-goal status changes. `@dxos/pipeline-rdf` now preserves a fact's illocution (force, mood, addressee) through the fact store, and exports its RDF vocabulary, fact ↔ triples mapping and predicate normalizer as `RDF.Vocab`, `RDF.Mapping` and `RDF.Predicate`, which `@dxos/brain` uses to canonicalize predicates.
