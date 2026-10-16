---
'@dxos/pipeline-rdf': minor
'@dxos/plugin-agent': minor
---

An agent's brain holds only facts: the agent remembers and recalls structured facts rather than free-text memories.

- `@dxos/plugin-agent` (breaking): `MemoryOperation.Remember` is now `org.dxos.operation.agent.recordFacts` and takes `facts` — each a subject, a predicate from the seed ontology (listed in the tool's description), an entity `object` or a literal `value`, and optional `quote`, `origin`, `confidence` and `supersedes` — and returns their ids. `Recall` returns `facts` (now with an `id`) and `goals` only, leaving out superseded, retracted and expired facts. `Forget`, `RecalledMemory`, `Mode.records` and the `@dxos/plugin-agent/Knowledge` subpath are removed. Profiles group the facts about their subject by predicate, and the knowledge, state and profile panels show facts in place of memories. Memories already stored in a brain are no longer read.
- `@dxos/pipeline-rdf`: exports `predicateSection`, the ontology's predicates as a prompt section.
