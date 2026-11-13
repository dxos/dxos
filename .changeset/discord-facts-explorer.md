---
'@dxos/pipeline-rdf': minor
'@dxos/plugin-assistant': minor
---

Fact stores gain `FactStoreApi.rows(sparql)` for open-ended SPARQL SELECTs, a file-backed `FactStoreLive.layerFile`, and `FactStoreHttp` to serve and query a store over HTTP; `generateSparql` writes full SPARQL from a question, newly minted predicates are named as written (`changed`, not `chang`), and `asked` / `has text` join the seed vocabulary. Discord crawls name each user by one `https://discord.com/users/<id>` IRI labelled from Discord, record detected questions as facts, take per-channel lookback settings, and retry channels that failed before. `Chat.Suggestions` shows premade prompts above the composer, and the entity browser, entity card and TriG snippet move from `@dxos/plugin-agent` to `@dxos/react-ui-rdf`.

Breaking: every `FactStoreApi` implementation must add `rows`, and `@dxos/plugin-agent/AgentKnowledge` no longer exports the moved components.
