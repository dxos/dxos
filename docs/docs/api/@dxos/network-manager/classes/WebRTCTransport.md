# Class `WebRTCTransport`
> Declared in [`packages/core/mesh/network-manager/src/transport/webrtc-transport.ts`](https://github.com/dxos/protocols/blob/main/packages/core/mesh/network-manager/src/transport/webrtc-transport.ts#L21)

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

---
- WebRTCTransport : Class
- constructor : Constructor
- new WebRTCTransport : Constructor signature
- _initiator : Parameter
- _stream : Parameter
- _ownId : Parameter
- _remoteId : Parameter
- _sessionId : Parameter
- _topic : Parameter
- _sendSignal : Parameter
- __type : Type literal
- __type : Call signature
- msg : Parameter
- _webrtcConfig : Parameter
- _peer : Property
- closed : Property
- connected : Property
- errors : Property
- peer : Accessor
- peer : Get signature
- remoteId : Accessor
- remoteId : Get signature
- sessionId : Accessor
- sessionId : Get signature
- _disconnectStreams : Method
- _disconnectStreams : Call signature
- close : Method
- close : Call signature
- signal : Method
- signal : Call signature
- signal : Parameter
