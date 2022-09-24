# Module: @dxos/client

## Table of contents

### Enumerations

- [ItemFilterDeleted](../enums/dxos_client.ItemFilterDeleted.md)
- [KeyType](../enums/dxos_client.KeyType.md)

### Classes

- [Client](../classes/dxos_client.Client.md)
- [ClientServiceHost](../classes/dxos_client.ClientServiceHost.md)
- [ClientServiceProxy](../classes/dxos_client.ClientServiceProxy.md)
- [Database](../classes/dxos_client.Database.md)
- [DevtoolsHostEvents](../classes/dxos_client.DevtoolsHostEvents.md)
- [EchoProxy](../classes/dxos_client.EchoProxy.md)
- [Entity](../classes/dxos_client.Entity.md)
- [HaloProxy](../classes/dxos_client.HaloProxy.md)
- [InvalidConfigurationError](../classes/dxos_client.InvalidConfigurationError.md)
- [Invitation](../classes/dxos_client.Invitation.md)
- [InvitationDescriptor](../classes/dxos_client.InvitationDescriptor.md)
- [InvitationProxy](../classes/dxos_client.InvitationProxy.md)
- [InvitationRequest](../classes/dxos_client.InvitationRequest.md)
- [Item](../classes/dxos_client.Item.md)
- [Link](../classes/dxos_client.Link.md)
- [NetworkManager](../classes/dxos_client.NetworkManager.md)
- [ObjectModel](../classes/dxos_client.ObjectModel.md)
- [OrderedList](../classes/dxos_client.OrderedList.md)
- [PartyInvitation](../classes/dxos_client.PartyInvitation.md)
- [PartyProxy](../classes/dxos_client.PartyProxy.md)
- [PartySerializer](../classes/dxos_client.PartySerializer.md)
- [RemoteServiceConnectionTimeout](../classes/dxos_client.RemoteServiceConnectionTimeout.md)
- [ResultSet](../classes/dxos_client.ResultSet.md)
- [Schema](../classes/dxos_client.Schema.md)
- [Selection](../classes/dxos_client.Selection.md)
- [SelectionResult](../classes/dxos_client.SelectionResult.md)

### Interfaces

- [ClientInfo](../interfaces/dxos_client.ClientInfo.md)
- [ClientOptions](../interfaces/dxos_client.ClientOptions.md)
- [ClientServiceProvider](../interfaces/dxos_client.ClientServiceProvider.md)
- [CreateInvitationRequestOpts](../interfaces/dxos_client.CreateInvitationRequestOpts.md)
- [CreationInvitationOptions](../interfaces/dxos_client.CreationInvitationOptions.md)
- [DevtoolsHook](../interfaces/dxos_client.DevtoolsHook.md)
- [DevtoolsServiceDependencies](../interfaces/dxos_client.DevtoolsServiceDependencies.md)
- [Echo](../interfaces/dxos_client.Echo.md)
- [Halo](../interfaces/dxos_client.Halo.md)
- [HaloInfo](../interfaces/dxos_client.HaloInfo.md)
- [HaloSigner](../interfaces/dxos_client.HaloSigner.md)
- [HandleInvitationRedemptionOpts](../interfaces/dxos_client.HandleInvitationRedemptionOpts.md)
- [HandleInvitationRedemptionResult](../interfaces/dxos_client.HandleInvitationRedemptionResult.md)
- [KeyRecord](../interfaces/dxos_client.KeyRecord.md)
- [OpenProgress](../interfaces/dxos_client.OpenProgress.md)
- [Party](../interfaces/dxos_client.Party.md)
- [PartyMember](../interfaces/dxos_client.PartyMember.md)
- [Profile](../interfaces/dxos_client.Profile.md)
- [SignRequest](../interfaces/dxos_client.SignRequest.md)
- [SignResponse](../interfaces/dxos_client.SignResponse.md)

### Type Aliases

- [ClientServices](dxos_client.md#clientservices)
- [ItemID](dxos_client.md#itemid)
- [PartyKey](dxos_client.md#partykey)
- [SchemaDef](dxos_client.md#schemadef)
- [SchemaField](dxos_client.md#schemafield)
- [SchemaRef](dxos_client.md#schemaref)

### Variables

- [DXOS\_VERSION](dxos_client.md#dxos_version)
- [PARTY\_ITEM\_TYPE](dxos_client.md#party_item_type)
- [TYPE\_SCHEMA](dxos_client.md#type_schema)
- [clientServiceBundle](dxos_client.md#clientservicebundle)
- [defaultConfig](dxos_client.md#defaultconfig)
- [defaultTestingConfig](dxos_client.md#defaulttestingconfig)

### Functions

- [createDevtoolsHost](dxos_client.md#createdevtoolshost)
- [createDevtoolsRpcServer](dxos_client.md#createdevtoolsrpcserver)
- [generateSeedPhrase](dxos_client.md#generateseedphrase)

## Type Aliases

### ClientServices

Ƭ **ClientServices**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `DataService` | `DataService` |
| `DevtoolsHost` | `DevtoolsHost` |
| `HaloService` | `HaloService` |
| `PartyService` | `PartyService` |
| `ProfileService` | `ProfileService` |
| `SystemService` | `SystemService` |
| `TracingService` | `TracingService` |

#### Defined in

[packages/sdk/client/src/packlets/api/client-service.ts:14](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/api/client-service.ts#L14)

___

### ItemID

Ƭ **ItemID**: `string`

#### Defined in

packages/echo/echo-protocol/dist/src/types.d.ts:41

___

### PartyKey

Ƭ **PartyKey**: `PublicKey`

#### Defined in

packages/echo/echo-protocol/dist/src/types.d.ts:43

___

### SchemaDef

Ƭ **SchemaDef**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `fields` | [`SchemaField`](dxos_client.md#schemafield)[] |
| `schema` | `string` |

#### Defined in

packages/echo/echo-db/dist/src/api/schema.d.ts:14

___

### SchemaField

Ƭ **SchemaField**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `ref?` | [`SchemaRef`](dxos_client.md#schemaref) |
| `required` | `boolean` |
| `type?` | `FieldType` |

#### Defined in

packages/echo/echo-db/dist/src/api/schema.d.ts:8

___

### SchemaRef

Ƭ **SchemaRef**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `field` | `string` |
| `schema` | `string` |

#### Defined in

packages/echo/echo-db/dist/src/api/schema.d.ts:4

## Variables

### DXOS\_VERSION

• `Const` **DXOS\_VERSION**: ``"2.33.8"``

#### Defined in

[packages/sdk/client/src/packlets/proxy/version.ts:1](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/version.ts#L1)

___

### PARTY\_ITEM\_TYPE

• `Const` **PARTY\_ITEM\_TYPE**: ``"dxos:item/party"``

#### Defined in

packages/echo/echo-db/dist/src/parties/data-party.d.ts:17

___

### TYPE\_SCHEMA

• `Const` **TYPE\_SCHEMA**: ``"dxos:type/schema"``

#### Defined in

packages/echo/echo-db/dist/src/api/schema.d.ts:2

___

### clientServiceBundle

• `Const` **clientServiceBundle**: `ServiceBundle`<[`ClientServices`](dxos_client.md#clientservices)\>

#### Defined in

[packages/sdk/client/src/packlets/api/client-service.ts:25](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/api/client-service.ts#L25)

___

### defaultConfig

• `Const` **defaultConfig**: `ConfigProto`

#### Defined in

[packages/sdk/client/src/packlets/proxy/client.ts:35](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/client.ts#L35)

___

### defaultTestingConfig

• `Const` **defaultTestingConfig**: `ConfigProto`

#### Defined in

[packages/sdk/client/src/packlets/proxy/client.ts:37](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/client.ts#L37)

## Functions

### createDevtoolsHost

▸ **createDevtoolsHost**(`context`, `events`): `DevtoolsHost`

#### Parameters

| Name | Type |
| :------ | :------ |
| `context` | [`DevtoolsServiceDependencies`](../interfaces/dxos_client.DevtoolsServiceDependencies.md) |
| `events` | [`DevtoolsHostEvents`](../classes/dxos_client.DevtoolsHostEvents.md) |

#### Returns

`DevtoolsHost`

#### Defined in

[packages/sdk/client/src/packlets/devtools/devtools-host.ts:25](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/devtools/devtools-host.ts#L25)

___

### createDevtoolsRpcServer

▸ **createDevtoolsRpcServer**(`client`, `serviceHost`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `client` | [`Client`](../classes/dxos_client.Client.md) |
| `serviceHost` | [`ClientServiceProvider`](../interfaces/dxos_client.ClientServiceProvider.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/proxy/devtools.ts:53](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/proxy/devtools.ts#L53)

___

### generateSeedPhrase

▸ **generateSeedPhrase**(): `string`

Generate bip39 seed phrase (aka mnemonic).

#### Returns

`string`

#### Defined in

packages/halo/credentials/dist/src/identity/seedphrase.d.ts:4
