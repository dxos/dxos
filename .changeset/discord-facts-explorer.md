---
'@dxos/pipeline-rdf': minor
'@dxos/plugin-assistant': minor
---

Fact stores gain `FactStoreApi.rows(sparql)` for open-ended SPARQL SELECTs (`rows` and `select` refuse updates), a file-backed `FactStoreLive.layerFile`, and `FactStoreHttp` to serve a store over HTTP to pages on this machine; `generateSparql` writes full SPARQL from a question, newly minted predicates are named as written (`changed`, not `chang`), and `asked` / `has text` join the seed vocabulary. Discord crawls name each user by one `https://discord.com/users/<id>` IRI labelled from Discord, record detected questions as facts, take per-channel lookback settings, and retry channels that failed before; Brain's Query Facts and Summarize Subject find entities by name or by any absolute IRI and skip superseded or retracted facts. `Chat.Suggestions` shows premade prompts above the composer, and the entity browser, entity card and TriG snippet move from `@dxos/plugin-agent` to `@dxos/react-ui-rdf`.

Breaking: every `FactStoreApi` implementation must add `rows`, and `@dxos/plugin-agent/AgentKnowledge` no longer exports the moved components.
