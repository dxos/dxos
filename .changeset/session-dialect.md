---
'@dxos/deus': minor
---

Add the session dialect (`org.dxos.spec.session`): a `SESSION.mdl` records an agent's working session with `goal`, `pr` and `event` blocks beside the changelog's questions and decisions. `deus changelog check` does not require a new decision when a `SESSION.mdl` changes, because its goals change every turn, and still rejects edits to its decisions and questions.
