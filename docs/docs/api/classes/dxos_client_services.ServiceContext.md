# Class: ServiceContext

[@dxos/client-services](../modules/dxos_client_services.md).ServiceContext

## Constructors

### constructor

**new ServiceContext**(`storage`, `networkManager`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `storage` | `Storage` |
| `networkManager` | `NetworkManager` |

#### Defined in

[packages/sdk/client-services/src/packlets/services/service-context.ts:43](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L43)

## Properties

### dataInvitations

 `Optional` **dataInvitations**: [`DataInvitations`](dxos_client_services.DataInvitations.md)

#### Defined in

[packages/sdk/client-services/src/packlets/services/service-context.ts:41](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L41)

___

### dataService

 `Readonly` **dataService**: `DataService`

#### Defined in

[packages/sdk/client-services/src/packlets/services/service-context.ts:31](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L31)

___

### feedStore

 `Readonly` **feedStore**: `FeedStore`

#### Defined in

[packages/sdk/client-services/src/packlets/services/service-context.ts:34](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L34)

___

### haloInvitations

 `Readonly` **haloInvitations**: [`HaloInvitations`](dxos_client_services.HaloInvitations.md)

#### Defined in

[packages/sdk/client-services/src/packlets/services/service-context.ts:37](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L37)

___

### identityManager

 `Readonly` **identityManager**: [`IdentityManager`](dxos_client_services.IdentityManager.md)

#### Defined in

[packages/sdk/client-services/src/packlets/services/service-context.ts:36](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L36)

___

### initialized

 `Readonly` **initialized**: `Trigger`

#### Defined in

[packages/sdk/client-services/src/packlets/services/service-context.ts:28](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L28)

___

### keyring

 `Readonly` **keyring**: `Keyring`

#### Defined in

[packages/sdk/client-services/src/packlets/services/service-context.ts:35](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L35)

___

### metadataStore

 `Readonly` **metadataStore**: `MetadataStore`

#### Defined in

[packages/sdk/client-services/src/packlets/services/service-context.ts:33](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L33)

___

### networkManager

 **networkManager**: `NetworkManager`

#### Defined in

[packages/sdk/client-services/src/packlets/services/service-context.ts:45](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L45)

___

### spaceManager

 `Optional` **spaceManager**: `SpaceManager`

#### Defined in

[packages/sdk/client-services/src/packlets/services/service-context.ts:40](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L40)

___

### storage

 **storage**: `Storage`

#### Defined in

[packages/sdk/client-services/src/packlets/services/service-context.ts:44](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L44)

## Methods

### \_initialize

`Private` **_initialize**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client-services/src/packlets/services/service-context.ts:85](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L85)

___

### close

**close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client-services/src/packlets/services/service-context.ts:70](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L70)

___

### createIdentity

**createIdentity**(): `Promise`<[`Identity`](dxos_client_services.Identity.md)\>

#### Returns

`Promise`<[`Identity`](dxos_client_services.Identity.md)\>

#### Defined in

[packages/sdk/client-services/src/packlets/services/service-context.ts:78](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L78)

___

### createInvitation

**createInvitation**(`space_key`, `onFinish?`): `Promise`<[`InvitationDescriptor`](dxos_client_services.InvitationDescriptor.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `space_key` | `PublicKey` |
| `onFinish?` | () => `void` |

#### Returns

`Promise`<[`InvitationDescriptor`](dxos_client_services.InvitationDescriptor.md)\>

#### Defined in

[packages/sdk/client-services/src/packlets/services/service-context.ts:112](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L112)

___

### joinSpace

**joinSpace**(`invitationDescriptor`): `Promise`<`Space`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitationDescriptor` | [`InvitationDescriptor`](dxos_client_services.InvitationDescriptor.md) |

#### Returns

`Promise`<`Space`\>

#### Defined in

[packages/sdk/client-services/src/packlets/services/service-context.ts:120](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L120)

___

### open

**open**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client-services/src/packlets/services/service-context.ts:63](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L63)
