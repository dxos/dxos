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
const newRpcPeer = new RpcPeer(
_options: RpcPeerOptions
)
```

## Properties

## Functions
