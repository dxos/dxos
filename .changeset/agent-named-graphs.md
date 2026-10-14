---
'@dxos/pipeline-rdf': minor
'@dxos/plugin-agent': minor
---

Facts are stored as statements in named graphs that state their provenance once, with predicates from an extensible ontology (`RDF.Ontology`) and entities keyed by real IRIs where one is known; a store from an earlier release migrates on open. Breaking: plugin-agent's `Memory` ECHO type is removed, since memories are now graphs in the agent's brain (`Knowledge`), recalled and superseded by id and withdrawn with the new Forget operation.
