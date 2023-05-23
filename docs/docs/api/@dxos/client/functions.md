---
title: Functions
---
# Functions
### [createDefaultModelFactory()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L35)



Returns: <code>ModelFactory</code>

Arguments: none

### [createDevtoolsRpcServer(client, clientServices)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/devtools/devtools.ts#L47)



Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`client`: <code>[Client](/api/@dxos/client/classes/Client)</code>

`clientServices`: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

### [fromCliEnv(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/cli-env.ts#L17)



Connects to locally running CLI daemon.


Returns: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

Arguments: 

`options`: <code>[FromCliEnvOptions](/api/@dxos/client/types/FromCliEnvOptions)</code>

### [fromIFrame(config, options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/utils.ts#L14)



Create services provider proxy connected via iFrame to host.


Returns: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/client/classes/Config)</code>

`options`: <code>Omit&lt;Partial&lt;[IFrameClientServicesProxyOptions](/api/@dxos/client/types/IFrameClientServicesProxyOptions)&gt;, "source"&gt;</code>

### [generateSeedPhrase()]()



Generate bip39 seed phrase (aka mnemonic).


Returns: <code>string</code>

Arguments: none

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

### [wrapObservable(observable)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/invitations/invitations.ts#L73)



Testing util to wrap non-authenticating observable with promise.
Don't use this in production code.


Returns: <code>Promise&lt;[Invitation](/api/@dxos/client/interfaces/Invitation)&gt;</code>

Arguments: 

`observable`: <code>[CancellableInvitationObservable](/api/@dxos/client/classes/CancellableInvitationObservable)</code>
