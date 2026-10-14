---
'@dxos/pipeline-rdf': minor
---

Fact extraction now reuses existing predicates and stable entity IRIs: the extractor is shown every predicate the brain knows and the known entities by name, and a predicate it has to invent is minted in the brain's own namespace with a definition, stored as an `rdf:Property` in the ontology graph (`FactStore.predicates`). The seed predicates now use schema.org, FOAF, Dublin Core, SKOS and RDF IRIs (`is a` is `rdf:type`), and a mention resolved to no stable IRI is local to the graph that mentions it. Breaking: stored predicate and class IRIs change for new facts (the former `dx:` IRIs stay equivalent, so older facts still match), and `FactStoreApi` gains `predicates`.
