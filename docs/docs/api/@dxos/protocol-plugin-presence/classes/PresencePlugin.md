# Class `PresencePlugin`
> Declared in [`packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts`](https://github.com/dxos/protocols/blob/main/packages/core/mesh/protocol-plugin-presence/src/presence-plugin.ts#L60)

Presence protocol plugin.

## Constructors
```ts
new PresencePlugin(
_peerId: Buffer,
options: PresenceOptions
)
```

---
- PresencePlugin : Class
- constructor : Constructor
- new PresencePlugin : Constructor signature
- _peerId : Parameter
- options : Parameter
- _broadcast : Property
- _codec : Property
- _connectionJoined : Property
- _connectionLeft : Property
- _error : Property
- _graph : Property
- _limit : Property
- _metadata : Property
- _neighborAlreadyConnected : Property
- _neighborJoined : Property
- _neighborLeft : Property
- _neighbors : Property
- _peerJoined : Property
- _peerLeft : Property
- _peerTimeout : Property
- _protocolMessage : Property
- _remotePing : Property
- _scheduler : Property
- extensionsCreated : Property
- graphUpdated : Property
- EXTENSION_NAME : Property
- graph : Accessor
- graph : Get signature
- metadata : Accessor
- metadata : Get signature
- peerId : Accessor
- peerId : Get signature
- peers : Accessor
- peers : Get signature
- _addPeer : Method
- _addPeer : Call signature
- protocol : Parameter
- _buildBroadcast : Method
- _buildBroadcast : Call signature
- _buildGraph : Method
- _buildGraph : Call signature
- _deleteNode : Method
- _deleteNode : Call signature
- id : Parameter
- _deleteNodeIfEmpty : Method
- _deleteNodeIfEmpty : Call signature
- id : Parameter
- _peerMessageHandler : Method
- _peerMessageHandler : Call signature
- protocol : Parameter
- chunk : Parameter
- _pingLimit : Method
- _pingLimit : Call signature
- _pruneGraph : Method
- _pruneGraph : Call signature
- _removePeer : Method
- _removePeer : Call signature
- protocol : Parameter
- _updateGraph : Method
- _updateGraph : Call signature
- __namedParameters : Parameter
- createExtension : Method
- createExtension : Call signature
- ping : Method
- ping : Call signature
- setMetadata : Method
- setMetadata : Call signature
- metadata : Parameter
- start : Method
- start : Call signature
- stop : Method
- stop : Call signature
