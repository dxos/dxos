# Class `IdentityManager`
Declared in [`packages/sdk/client-services/src/packlets/identity/identity-manager.ts:42`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity-manager.ts#L42)




## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity-manager.ts#L49)


Returns: [`IdentityManager`](/api/@dxos/client-services/classes/IdentityManager)

Arguments: 

`_metadataStore`: `MetadataStore`

`_feedStore`: `FeedStore<FeedMessage>`

`_keyring`: `Keyring`

`_networkManager`: `NetworkManager`

`_modelFactory`: `ModelFactory`

## Properties
### [`stateUpdate`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity-manager.ts#L43)
Type: `Event<void>`
### [`identity`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity-manager.ts#L57)
Type: `undefined | `[`Identity`](/api/@dxos/client-services/classes/Identity)

## Methods
### [`acceptIdentity`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity-manager.ts#L187)


Accept an existing identity. Expects it's device key to be authorized.

Returns: `Promise<`[`Identity`](/api/@dxos/client-services/classes/Identity)`>`

Arguments: 

`params`: [`JoinIdentityParams`](/api/@dxos/client-services/types/JoinIdentityParams)
### [`close`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity-manager.ts#L73)


Returns: `Promise<void>`

Arguments: none
### [`createIdentity`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity-manager.ts#L125)


Returns: `Promise<`[`Identity`](/api/@dxos/client-services/classes/Identity)`>`

Arguments: none
### [`open`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity-manager.ts#L61)


Returns: `Promise<void>`

Arguments: none