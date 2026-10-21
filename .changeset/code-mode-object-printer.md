---
'@dxos/assistant': minor
'@dxos/plugin-projects': patch
---

Code-mode `print` renders an ECHO object as a compact card — schema fields, refs as `→ type id "label"`, long values cut with a marker — followed by counts of its relations, children and referrers with the exact query that fetches each, and the skills its type declares that the chat has not enabled; Effect `Result`/`Exit`/`Option` values and errors print by their real fields. A request now shows history calls to tools it no longer offers as text rather than as callable tool calls, `query-skills` takes a `query` that finds the skill providing a tool by name or description, and a chat attached to a feature binds the project skill.
