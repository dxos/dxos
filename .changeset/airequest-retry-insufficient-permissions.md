---
'@dxos/assistant': patch
---

Retry a model request the provider rejected with `InsufficientPermissions`. Anthropic returns this while a key's permissions are still propagating, and the failure previously killed the turn outright, leaving the reader with no reply. `AiRequest.runAgentTurn` now re-issues the request up to ten times, spaced two seconds apart with jitter, and only while no block of the turn has been emitted yet — so a retry can never duplicate content. The other authentication kinds (missing, expired, or invalid key) need a credential change and still surface immediately.
