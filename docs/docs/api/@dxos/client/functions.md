---
title: Functions
---
# Functions
### [createDefaultModelFactory()]()



Returns: <code>ModelFactory</code>

Arguments: none

### [createDevtoolsRpcServer(client, clientServices)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/devtools/devtools.ts#L48)



Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`client`: <code>[Client](/api/@dxos/client/classes/Client)</code>

`clientServices`: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

### [diagnostics(client, options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/diagnostics/diagnostics.ts#L44)



Returns: <code>Promise&lt;any&gt;</code>

Arguments: 

`client`: <code>[Client](/api/@dxos/client/classes/Client)</code>

`options`: <code>[DiagnosticOptions](/api/@dxos/client/types/DiagnosticOptions)</code>

### [fromAgent(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/agent.ts#L27)



Connects to locally running CLI daemon.


Returns: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

Arguments: 

`options`: <code>[fromAgentOptions](/api/@dxos/client/types/fromAgentOptions)</code>

### [fromHost(config, \[params\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/utils.ts#L46)



Creates stand-alone services without rpc.


Returns: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/client/classes/Config)</code>

`params`: <code>ClientServicesHostParams</code>

### [fromIFrame(config, options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/utils.ts#L20)



Create services provider proxy connected via iFrame to host.


Returns: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/client/classes/Config)</code>

`options`: <code>Omit&lt;Partial&lt;[IFrameClientServicesProxyOptions](/api/@dxos/client/types/IFrameClientServicesProxyOptions)&gt;, "source"&gt;</code>

### [fromSocket(url)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/socket.ts#L11)



Access to remote client via a socket.


Returns: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

Arguments: 

`url`: <code>string</code>

### [generateSeedPhrase()]()



Generate bip39 seed phrase (aka mnemonic).


Returns: <code>string</code>

Arguments: none

### [getUnixSocket(profile, protocol)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/agent.ts#L17)



Returns: <code>string</code>

Arguments: 

`profile`: <code>string</code>

`protocol`: <code>string</code>

### [isReferenceLike(value)]()



Returns: <code>value is object</code>

Arguments: 

`value`: <code>any</code>

### [isTypedObject(object)]()



Returns: <code>object is [TypedObject](/api/@dxos/client/values#TypedObject)&lt;Record&lt;string, any&gt;&gt;</code>

Arguments: 

`object`: <code>unknown</code>

### [setStateFromSnapshot(obj, snapshot)]()



Returns: <code>void</code>

Arguments: 

`obj`: <code>[EchoObject](/api/@dxos/client/classes/EchoObject)&lt;any&gt;</code>

`snapshot`: <code>ObjectSnapshot</code>

### [wrapObservable(observable)]()



Testing util to wrap non-authenticating observable with promise.
Don't use this in production code.


Returns: <code>Promise&lt;[Invitation](/api/@dxos/client/interfaces/Invitation)&gt;</code>

Arguments: 

`observable`: <code>[CancellableInvitationObservable](/api/@dxos/client/classes/CancellableInvitationObservable)</code>
