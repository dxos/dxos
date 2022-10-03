# Class: IdentityManager

[@dxos/client-services](../modules/dxos_client_services.md).IdentityManager

## Constructors

### constructor

**new IdentityManager**(`_metadataStore`, `_feedStore`, `_keyring`, `_networkManager`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_metadataStore` | `MetadataStore` |
| `_feedStore` | `FeedStore` |
| `_keyring` | `Keyring` |
| `_networkManager` | `NetworkManager` |

#### Defined in

[packages/sdk/client-services/src/packlets/identity/identity-manager.ts:39](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/identity/identity-manager.ts#L39)

## Properties

### \_identity

 `Private` `Optional` **\_identity**: [`Identity`](dxos_client_services.Identity.md)

#### Defined in

[packages/sdk/client-services/src/packlets/identity/identity-manager.ts:36](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/identity/identity-manager.ts#L36)

___

### stateUpdate

 `Readonly` **stateUpdate**: `Event`<`void`\>

#### Defined in

[packages/sdk/client-services/src/packlets/identity/identity-manager.ts:34](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/identity/identity-manager.ts#L34)

## Accessors

### identity

`get` **identity**(): `undefined` \| [`Identity`](dxos_client_services.Identity.md)

#### Returns

`undefined` \| [`Identity`](dxos_client_services.Identity.md)

#### Defined in

[packages/sdk/client-services/src/packlets/identity/identity-manager.ts:46](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/identity/identity-manager.ts#L46)

## Methods

### \_constructIdentity

`Private` **_constructIdentity**(`identityRecord`): `Promise`<[`Identity`](dxos_client_services.Identity.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `identityRecord` | `IdentityRecord` |

#### Returns

`Promise`<[`Identity`](dxos_client_services.Identity.md)\>

#### Defined in

[packages/sdk/client-services/src/packlets/identity/identity-manager.ts:66](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/identity/identity-manager.ts#L66)

___

### \_constructSpace

`Private` **_constructSpace**(`__namedParameters`): `Promise`<`Space`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `ConstructSpaceParams` |

#### Returns

`Promise`<`Space`\>

#### Defined in

[packages/sdk/client-services/src/packlets/identity/identity-manager.ts:89](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/identity/identity-manager.ts#L89)

___

### acceptIdentity

**acceptIdentity**(`params`): `Promise`<[`Identity`](dxos_client_services.Identity.md)\>

Accept an existing identity. Expects it's device key to be authorized.

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | [`JoinIdentityParams`](../types/dxos_client_services.JoinIdentityParams.md) |

#### Returns

`Promise`<[`Identity`](dxos_client_services.Identity.md)\>

#### Defined in

[packages/sdk/client-services/src/packlets/identity/identity-manager.ts:159](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/identity/identity-manager.ts#L159)

___

### close

**close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client-services/src/packlets/identity/identity-manager.ts:62](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/identity/identity-manager.ts#L62)

___

### createIdentity

**createIdentity**(): `Promise`<[`Identity`](dxos_client_services.Identity.md)\>

#### Returns

`Promise`<[`Identity`](dxos_client_services.Identity.md)\>

#### Defined in

[packages/sdk/client-services/src/packlets/identity/identity-manager.ts:111](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/identity/identity-manager.ts#L111)

___

### open

**open**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client-services/src/packlets/identity/identity-manager.ts:50](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/identity/identity-manager.ts#L50)
