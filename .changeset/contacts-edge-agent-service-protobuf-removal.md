---
'@dxos/protocols': minor
---

Delete the protobuf `ContactsService`/`EdgeAgentService` service definitions from `dxos/client/services.proto` now that both are served entirely over `@effect/rpc` (their message types, `ContactBook`/`QueryEdgeStatusResponse`/`QueryAgentStatusResponse`, are unaffected and remain protobuf-encoded on the wire). Consumers that imported the generated `ContactsService`/`EdgeAgentService` proto interface types must use `@dxos/protocols/rpc`'s effect-rpc definitions instead; `@dxos/client-protocol`'s deprecated `ClientServices['EdgeAgentService']` Promise/Stream surface is unaffected and now backed by a hand-written type with the same shape (`ClientServices['ContactsService']` had no consumers and is removed).
