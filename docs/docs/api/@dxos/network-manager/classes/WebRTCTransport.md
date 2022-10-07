# Class `WebRTCTransport`
> Declared in package `@dxos/network-manager`

Implements Transport for WebRTC. Uses simple-peer under the hood.

## Constructors
```ts
new WebRTCTransport(
_initiator: boolean,
_stream: ReadWriteStream,
_ownId: PublicKey,
_remoteId: PublicKey,
_sessionId: PublicKey,
_topic: PublicKey,
_sendSignal: Function,
_webrtcConfig: any
)
```
