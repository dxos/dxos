---
'@dxos/agent-code-mode': patch
---

Code mode shows `console.log`, `info`, `warn`, `error` and `debug` output to the model, as `print` does, in every sandbox, and an `eval` that printed and returned nothing now says it ran instead of returning `null` or an empty result. The plain dialect's `describe()` also takes an operation's output, such as `{ object }`, and describes the stored object it names.
