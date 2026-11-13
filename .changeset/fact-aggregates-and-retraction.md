---
'@dxos/pipeline-rdf': minor
'@dxos/react-ui-rdf': minor
'@dxos/plugin-discord': patch
'@dxos/react-ui': patch
---

Fact reads no longer have to load the whole store to say anything about it, and a fact can now be corrected without being lost.

`FactStoreApi` gains `count`, `aggregate`, `entityLabels` and `statuses`, each compiled to SPARQL so the work happens in the quad store rather than over materialized facts — a bounded read whose cost is the size of its result, not a count of statements. `SemanticQuery` gains a `limit` that caps the candidate graphs a read loads, applied after the graph-level constraints (`minConfidence`, `current`) so a capped read is a window on the facts that match rather than on the graphs scanned to find them. `FactAnalyticsLive` wraps either a store or a plain fact array behind one `FactAnalytics` surface, so a view written once runs over a mailbox-sized store and over a fixture unchanged.

`Graph.supersede` and `Graph.retract` link a correction to the graph it replaces or withdraws — the schema has carried `sx:supersedes` and `sx:retracts` from the start, but nothing created them and no query read them. `SemanticQuery.current` honours the links in both backends (`FILTER NOT EXISTS` in SQL, `Graph.status` in JS), so `count` and `aggregate` agree with the list they stand over, and `statuses` reports whether a claim was superseded or retracted — read from the store, since a withdrawal need not share the subject or predicate of the claim it withdraws.

`@dxos/react-ui-rdf` adds three composites over that surface. `FactExplorer` is an aggregate-first overview — predicates and entities ranked, an entity × predicate cross-tab, and a capped fact list that states the true total — where clicking anything narrows the scope. `FactMemory` is the held-out-message view: an incoming message beside what the store already knew about the entities it mentions. `FactBelief` is one question, the answer that stands, and every claim behind it, a withdrawn one struck through with its original author and date. `@dxos/pipeline-rdf/testing` gains `generateCorpus`, `splitCorpus` and `beliefDemo` — a deterministic inbox-shaped corpus and the scripted correction the stories run on.

`@dxos/plugin-discord`'s write-only fact-feed store declines the four new reads, as it already declines `query` and `select`. The HTTP fact store carries them over the wire — one `POST` per read, maps as plain objects — and its wire query gains `current` and `limit`, which it would otherwise drop in silence.

Two `@dxos/react-ui` fixes the explorer surfaced, both of which affect every consumer. A nested ScrollArea viewport whose content fits no longer contains the wheel: an `overflow: auto` box is a scroll container even with nothing to scroll, so a short list inside a long panel used to stop that panel dead. And a toolbar now gives its free space to an explicit `Toolbar.Separator variant='gap'` rather than splitting it with the label, which stranded whatever sat between them in the middle of the row; tags in a toolbar take the row's inset, so two adjacent ones no longer touch.
