---
'@dxos/protocols': minor
'@dxos/client-protocol': minor
---

Delete the protobuf `service {}` definitions for `ContactsService`, `EdgeAgentService`,
`DevicesService`, `NetworkService`, `InvitationsService`, `IdentityService`, `SystemService`,
`LoggingService`, `FeedService`, and `QueryService` from `dxos/client/services.proto`,
`dxos/client/logging.proto`, `dxos/client/feed.proto` (file removed entirely), and
`dxos/echo/query.proto`, now that all ten are served entirely over `@effect/rpc`. Message
types still shared outside the RPC boundary (`ContactBook`, `QueryEdgeStatusResponse`,
`QueryAgentStatusResponse`, `Device`, `Invitation`, `Identity`, `NetworkStatus`, `Platform`,
`LogEntry`, and the `QueryService` request/response types, among others) are unaffected and
remain protobuf-encoded on the wire. Consumers that imported a generated proto service
interface type for any of these ten services must use `@dxos/protocols/rpc`'s effect-rpc
definitions instead. `@dxos/client-protocol`'s deprecated `ClientServices` map keeps its existing entries'
signatures — each is now backed by a hand-written Promise/`Stream` interface with the same
shape as before — except `ClientServices['ContactsService']`, which had no consumers and is
removed.
