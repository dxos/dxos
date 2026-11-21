---
'@dxos/deus': minor
---

Add the session dialect (`org.dxos.spec.session`): a `SESSION.mdl` records an agent's working session with `goal`, `pr` and `event` blocks beside the changelog's questions and decisions. `deus changelog check` skips `SESSION.mdl` files, because their goals change on every turn.
