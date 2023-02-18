---
title: Functions
---
# Functions
### [createDevtoolsRpcServer(client, clientServices)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/devtools/devtools.ts#L48)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`client`: <code>[Client](/api/@dxos/client/classes/Client)</code>

`clientServices`: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>
### [fromHost(config)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/utils.ts#L36)


Creates stand-alone services without rpc.

Returns: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/client/classes/Config)</code>
### [fromIFrame(config, \[shell\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/utils.ts#L22)


Create services provider proxy connected via iFrame to host.

Returns: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/client/classes/Config)</code>

`shell`: <code>boolean</code>
### [generateSeedPhrase()]()


Generate bip39 seed phrase (aka mnemonic).

Returns: <code>string</code>

Arguments: none
### [isDocument(object)]()


Returns: <code>object is [DocumentBase](/api/@dxos/client/classes/DocumentBase)</code>

Arguments: 

`object`: <code>any</code>
### [isReferenceLike(value)]()


Returns: <code>value is object</code>

Arguments: 

`value`: <code>any</code>
### [strip(obj)]()


Remove keys with undefined values.

Returns: <code>any</code>

Arguments: 

`obj`: <code>any</code>