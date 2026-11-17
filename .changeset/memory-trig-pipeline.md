---
'@dxos/pipeline-rdf': minor
'@dxos/plugin-brain': minor
---

A fact store moves in and out as TriG (Turtle with a named graph per fact): `FactStoreApi.exportTrig` and `importTrig`, served by `FactStoreHttp` too. `RDF.Pipeline` keeps the state of the run that filled a store beside its facts — each source's cursor and first and last item, each stage's model calls, tokens and catalog cost, the run's time and the facts written — and the Discord facts CLI's `trig` mode writes it from a crawl's `crawl.db` and `trace.jsonl`.

Brain adds a Memory view, under a space's settings and as a context-sidebar panel, that imports and exports the space's store as TriG, runs SPARQL, and shows every query an agent runs against the store, with its rows, as it runs; and a Pipeline panel that draws the recorded run on a read-only canvas with its counters, cost, models and busiest channels. The Brain skill now has a description, so the Skill Manager offers it as the space's memory.

Breaking: `FactStoreApi` gains `exportTrig` and `importTrig`, which every implementation must provide; `FactStoreRegistry` gains `logged`, `queries` and `subscribeQueries`, and operations now get the logged store.
