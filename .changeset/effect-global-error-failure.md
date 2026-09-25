---
'@dxos/client-services': minor
---

Effect failure channels carry tagged errors rather than the global `Error`. Where the channel was also annotated `Effect<..., Error>` the annotation is narrowed too, since a tagged error behind an `Error` annotation is not something `catchTag` can see: the RPC service implementations declare `BaseError`, and the assistant's connector validation declares the error it actually raises.

`DevtoolsHost`'s seven unimplemented stubs fail with `NotImplementedError` naming the method, rather than a fallback error whose message asserted that an operation failed.

DeepSeek API-key validation raises `ConnectorKeyInvalidError` for a 401/403, matching what the Anthropic form already raised for the same condition.
