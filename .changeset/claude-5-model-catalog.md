---
'@dxos/ai': minor
---

The Claude model catalog now serves Claude Opus 5 and Claude Sonnet 5 (`com.anthropic.model.claude-opus-5.default`, `com.anthropic.model.claude-sonnet-5.default`, both with thinking enabled), replacing Claude Opus 4.8 and Claude Sonnet 4.6 — the old model DXNs no longer resolve. A tool call whose parameters fail provider-side validation now ends the response stream cleanly instead of failing the request.
