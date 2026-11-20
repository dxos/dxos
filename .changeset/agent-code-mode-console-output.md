---
'@dxos/agent-code-mode': patch
---

Code mode shows `console.log`, `info`, `warn`, `error`, `debug` and `dir` output to the model, in the same output as `print`, in every sandbox, and an `eval` that printed and returned nothing now says it ran instead of returning `null` or an empty result. The plain dialect's `describe()` also takes an object's id or an operation's output, such as `{ object }`, and describes the stored object it names.
