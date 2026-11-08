---
'@dxos/pipeline-rdf': minor
'@dxos/react-ui-rdf': minor
'@dxos/plugin-discord': patch
---

A fact can now be corrected without being lost. `Graph.supersede` and `Graph.retract` link a correction to the graph it replaces or withdraws — the schema has carried `sx:supersedes` and `sx:retracts` from the start, but nothing created them and no query read them. `SemanticQuery.current` honours the links in both backends (`FILTER NOT EXISTS` in SQL, `Graph.status` in JS), so `count` and `aggregate` agree with the list they stand over, and `FactStoreApi.statuses` reports whether a claim was superseded or retracted — read from the store, since a withdrawal need not share the subject or predicate of the claim it withdraws.

`@dxos/react-ui-rdf` adds `FactBelief`: one question, the answer that stands, and every claim behind it, a withdrawn one struck through with its original author and date. `@dxos/pipeline-rdf/testing` gains `beliefDemo`, the scripted case it runs on.
