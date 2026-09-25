---
'@dxos/ai': minor
---

`ScriptedLanguageModel` (`@dxos/ai/testing`) can script reasoning with `reasoning(text)`, emitted as
provider-native `reasoning-*` parts, and hold a turn with `delay`. A script may also be a generator,
`(request, index) => turn`, for a long-lived app that serves any number of conversations rather than
one fixed test. `ScriptedRequest` now carries the names of the tools offered on the call.
