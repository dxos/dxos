# Class `RpcPeer`
> Declared in [`packages/core/mesh/rpc/src/rpc.ts`](https://github.com/dxos/protocols/blob/main/packages/core/mesh/rpc/src/rpc.ts#L67)

A remote procedure call peer.

Provides a away to make RPC calls and get a response back as a promise.
Does not handle encoding/decoding and only works with byte buffers.
For type safe approach see  `createRpcClient`  and  `createRpcServer` .

Must be connected with another instance on the other side via  `send` / `receive`  methods.
Both sides must be opened before making any RPC calls.

Errors inside the handler get serialized and sent to the other side.

Inspired by JSON-RPC 2.0 https://www.jsonrpc.org/specification.

## Constructors
```ts
new RpcPeer(
_options: RpcPeerOptions
)
```

---
- RpcPeer : Class
- constructor : Constructor
- new RpcPeer : Constructor signature
- _options : Parameter
- _clearOpenInterval : Property
- _localStreams : Property
- _nextId : Property
- _open : Property
- _outgoingRequests : Property
- _remoteOpenTrigger : Property
- _unsubscribe : Property
- _callHandler : Method
- _callHandler : Call signature
- req : Parameter
- _callStreamHandler : Method
- _callStreamHandler : Call signature
- req : Parameter
- callback : Parameter
- __type : Type literal
- __type : Call signature
- response : Parameter
- _receive : Method
- _receive : Call signature
- msg : Parameter
- _sendMessage : Method
- _sendMessage : Call signature
- message : Parameter
- call : Method
- call : Call signature
- method : Parameter
- request : Parameter
- callStream : Method
- callStream : Call signature
- method : Parameter
- request : Parameter
- close : Method
- close : Call signature
- open : Method
- open : Call signature
