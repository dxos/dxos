# Class `SignalClient`
> Declared in [`packages/core/mesh/messaging/src/signal-client.ts`](https://github.com/dxos/protocols/blob/main/packages/core/mesh/messaging/src/signal-client.ts#L59)

Establishes a websocket connection to signal server and provides RPC methods.

## Constructors
```ts
new SignalClient(
_host: string,
_onMessage: Function
)
```

---
- SignalClient : Class
- constructor : Constructor
- new SignalClient : Constructor signature
- _host : Parameter
- _onMessage : Parameter
- __type : Type literal
- __type : Call signature
- __namedParameters : Parameter
- __type : Type literal
- author : Property
- payload : Property
- recipient : Property
- _cleanupSubscriptions : Property
- _client : Property
- _connectionStarted : Property
- _lastError : Property
- _lastStateChange : Property
- _messageStreams : Property
- _reconnectAfter : Property
- _reconnectIntervalId : Property
- _state : Property
- _swarmStreams : Property
- commandTrace : Property
- statusChanged : Property
- swarmEvent : Property
- _createClient : Method
- _createClient : Call signature
- _reconnect : Method
- _reconnect : Call signature
- _setState : Method
- _setState : Call signature
- newState : Parameter
- _subscribeSwarmEvents : Method
- _subscribeSwarmEvents : Call signature
- topic : Parameter
- peerId : Parameter
- close : Method
- close : Call signature
- getStatus : Method
- getStatus : Call signature
- join : Method
- join : Call signature
- __namedParameters : Parameter
- __type : Type literal
- peerId : Property
- topic : Property
- leave : Method
- leave : Call signature
- __namedParameters : Parameter
- __type : Type literal
- peerId : Property
- topic : Property
- sendMessage : Method
- sendMessage : Call signature
- msg : Parameter
- subscribeMessages : Method
- subscribeMessages : Call signature
- peerId : Parameter
