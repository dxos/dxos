---
'@dxos/pipeline-rdf': minor
---

Fact extraction now seeds its ontology with curated predicates from published vocabularies by default (`RDF.Vocabularies.DEFAULT`: schema.org, FOAF, Dublin Core, W3C ORG and SIOC under their own IRIs); pass an `ontology` to narrow it, and `ExtractOptions.closed` drops relations no listed predicate fits instead of minting new ones. `ExtractOptions.extractor: 'system-one'` extracts with Cloudflare's Clairic and Clef models, falling back to the LLM per uncertain claim. The LLM extractor and the Discord stages default to Claude Haiku 5.5, which the model catalog now lists along with list prices (`Model.pricing`).

Model calls can be metered: `AiUsage.instrument` reports each language-model call's tokens, `AiUsage.withStage` attributes them to a pipeline stage, and `AiMetering.metered` (in `@dxos/compute`) is an `AiService` layer that writes each call as a durable `Trace.ModelCall` event, with `AiMetering.summarize` totalling them by model and stage at catalog prices. Brain gains a Query SPARQL tool for raw SELECTs, and the fact tools cap what they return to the agent (50 rows, 500 characters a value) with a note to page with `LIMIT`/`OFFSET`; Query Facts takes an `offset` and returns `{ facts, total, note }`.

Breaking: extraction without an explicit `ontology` now shows the model the vocabulary packs as well as the seed predicates, so it reuses published predicates and its prompt is longer; Query Facts returns `{ facts, total, note? }` instead of an array.
