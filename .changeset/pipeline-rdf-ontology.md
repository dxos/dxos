---
'@dxos/pipeline-rdf': minor
'@dxos/plugin-agent': minor
---

Fact extraction now reuses existing predicates and stable entity IRIs. The extractor is shown every predicate the brain knows and the known entities by name. A predicate it has to invent is minted in the brain's own namespace with a definition, and stored as an `rdf:Property` in the ontology graph (`FactStore.predicates`). Every fact store now starts with the seed vocabulary (schema.org, FOAF, Dublin Core, SKOS and RDF predicates; `is a` is `rdf:type`) and gets it back when cleared. A mention resolved to no stable IRI is local to the graph that mentions it. The agent knowledge panel gains a Predicates tab. Breaking: new facts are stored with different predicate and class IRIs (the former `dx:` IRIs stay equivalent, so older facts still match), and `FactStoreApi` gains `predicates`.
