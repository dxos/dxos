---
title: Functions
---
# Functions
### [createDefaultModelFactory()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L34)



Returns: <code>ModelFactory</code>

Arguments: none

### [createDevtoolsRpcServer(client, clientServices)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/devtools/devtools.ts#L47)



Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`client`: <code>[Client](/api/@dxos/client/classes/Client)</code>

`clientServices`: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

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



Returns: <code>object is [TypedObject](/api/@dxos/client/values#TypedObject)&lt;object&gt;</code>

Arguments: 

`object`: <code>unknown</code>

### [wrapObservable(observable)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/invitations/invitations.ts#L100)



Testing util to wrap non-authenticating observable with promise.
Don't use this in production code.


Returns: <code>Promise&lt;[Invitation](/api/@dxos/client/interfaces/Invitation)&gt;</code>

Arguments: 

`observable`: <code>[CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)</code>
