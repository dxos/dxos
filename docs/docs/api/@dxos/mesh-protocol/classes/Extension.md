# Class `Extension`
> Declared in [`packages/core/mesh/mesh-protocol/src/extension.ts`](https://github.com/dxos/protocols/blob/main/packages/core/mesh/mesh-protocol/src/extension.ts#L51)

Reliable message passing via using Dat protocol extensions.
Events: "send", "receive", "error"

## Constructors
```ts
new Extension(
name: string,
options: ExtensionOptions
)
```

---
- Extension : Class
- constructor : Constructor
- new Extension : Constructor signature
- name : Parameter
- options : Parameter
- [kCodec] : Property
- _closeHandler : Property
- _feedHandler : Property
- _handshakeHandler : Property
- _initHandler : Property
- _messageHandler : Property
- _name : Property
- _protocol : Property
- _protocolExtension : Property
- _subscribeCb : Property
- close : Property
- emit : Property
- nmOptions : Property
- on : Property
- open : Property
- request : Property
- userSchema : Property
- name : Accessor
- name : Get signature
- _buildMessage : Method
- _buildMessage : Call signature
- message : Parameter
- _close : Method
- _close : Call signature
- _onMessage : Method
- _onMessage : Call signature
- msg : Parameter
- _open : Method
- _open : Call signature
- _send : Method
- _send : Call signature
- chunk : Parameter
- _subscribe : Method
- _subscribe : Call signature
- next : Parameter
- __type : Type literal
- __type : Call signature
- msg : Parameter
- onFeed : Method
- onFeed : Call signature
- discoveryKey : Parameter
- onHandshake : Method
- onHandshake : Call signature
- onInit : Method
- onInit : Call signature
- openWithProtocol : Method
- openWithProtocol : Call signature
- protocol : Parameter
- send : Method
- send : Call signature
- message : Parameter
- options : Parameter
- __type : Type literal
- oneway : Property
- setCloseHandler : Method
- setCloseHandler : Call signature
- closeHandler : Parameter
- setFeedHandler : Method
- setFeedHandler : Call signature
- feedHandler : Parameter
- setHandshakeHandler : Method
- setHandshakeHandler : Call signature
- handshakeHandler : Parameter
- setInitHandler : Method
- setInitHandler : Call signature
- initHandler : Parameter
- setMessageHandler : Method
- setMessageHandler : Call signature
- messageHandler : Parameter
