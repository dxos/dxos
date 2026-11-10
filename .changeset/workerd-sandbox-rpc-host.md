---
'@dxos/agent-code-mode': minor
---

`WorkerdSandbox` calls its host over Workers RPC instead of `fetch`: the isolate has no network, and its calls come back into the invocation that started it, so it runs inside a Durable Object. The `outbound` and `register` options and `registerHost` are gone; `make` takes only the `loader`. The isolate now has the whole plain dialect: `describe`, `relations`, `children` and `referrers` run on the host, a printed object prints as the live object, and `ref(obj)` crosses as a marker the host turns into a reference in `make`, `update` and operation inputs. The package is now public, so EDGE can install it.
