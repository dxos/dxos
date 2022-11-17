---
title: Functions
---
# Functions
### [`createDevtoolsRpcServer`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/devtools/devtools.ts#L54)


Returns: `Promise<void>`

Arguments: 

`client`: [`Client`](/api/@dxos/client/classes/Client)

`clientServices`: [`ClientServicesProvider`](/api/@dxos/client/interfaces/ClientServicesProvider)
### [`createNetworkManager`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/utils.ts#L43)


Creates a WebRTC network manager connected to the specified signal server.

Returns: `NetworkManager`

Arguments: 

`config`: `Config`

`options`: `Partial<NetworkManagerOptions>`
### [`fromDefaults`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/utils.ts#L31)


Creates stand-alone services.

Returns: [`ClientServicesProvider`](/api/@dxos/client/interfaces/ClientServicesProvider)

Arguments: 

`config`: `Config | Config`
### [`fromIFrame`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/utils.ts#L26)


Create services provider proxy connected via iFrame to host.

Returns: [`ClientServicesProvider`](/api/@dxos/client/interfaces/ClientServicesProvider)

Arguments: 

`config`: `Config | Config`

`channel`: `string`
### [`generateSeedPhrase`]()


Generate bip39 seed phrase (aka mnemonic).

Returns: `string`

Arguments: none
### [`invitationObservable`]()


Util to wrap observable with promise.

Returns: `Promise<`[`Invitation`](/api/@dxos/client/interfaces/Invitation)`>`

Arguments: 

`observable`: `Observable<`[`InvitationEvents`](/api/@dxos/client/interfaces/InvitationEvents)`>`