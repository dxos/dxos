---
title: Functions
---
# Functions
### [createDevtoolsRpcServer(client, clientServices)](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/devtools/devtools.ts#L54)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`client`: <code>[Client](/api/@dxos/client/classes/Client)</code>

`clientServices`: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>
### [createNetworkManager(config, options)](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/utils.ts#L36)


Creates a WebRTC network manager connected to the specified signal server.

Returns: <code>NetworkManager</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/client/classes/Config)</code>

`options`: <code>Partial&lt;NetworkManagerOptions&gt;</code>
### [fromHost(config)](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/utils.ts#L28)


Creates stand-alone services without rpc.

Returns: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/client/classes/Config)</code>
### [fromIFrame(config, channel)](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/utils.ts#L22)


Create services provider proxy connected via iFrame to host.

Returns: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/client/classes/Config)</code>

`channel`: <code>string</code>
### [generateSeedPhrase()]()


Generate bip39 seed phrase (aka mnemonic).

Returns: <code>string</code>

Arguments: none
### [invitationObservable(observable)]()


Util to wrap observable with promise.

Returns: <code>Promise&lt;[Invitation](/api/@dxos/client/interfaces/Invitation)&gt;</code>

Arguments: 

`observable`: <code>Observable&lt;[InvitationEvents](/api/@dxos/client/interfaces/InvitationEvents)&gt;</code>