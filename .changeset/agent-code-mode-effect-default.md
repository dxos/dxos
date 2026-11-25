---
'@dxos/agent-code-mode': minor
---

`makeCodeModeTurnProducer` writes the Effect dialect when it is given no `dialect`; it used to write the plain one. A sandbox that cannot host the Effect dialect names its own default in `Sandbox.defaultDialect`: `WorkerdSandbox` names `PlainDialect`, so a producer built on it keeps writing plain code. Pass `dialect: PlainDialect` to keep the plain dialect on any other sandbox.
