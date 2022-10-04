# Class: Space

[@dxos/echo-db](../modules/dxos_echo_db.md).Space

Spaces are globally addressable databases with access control.

## Constructors

### constructor

**new Space**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`SpaceParams`](../types/dxos_echo_db.SpaceParams.md) |

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space.ts:60](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space.ts#L60)

## Properties

### \_controlFeed

 `Private` `Readonly` **\_controlFeed**: `FeedDescriptor`

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space.ts:46](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space.ts#L46)

___

### \_controlPipeline

 `Private` `Readonly` **\_controlPipeline**: `ControlPipeline`

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space.ts:51](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space.ts#L51)

___

### \_dataFeed

 `Private` `Readonly` **\_dataFeed**: `FeedDescriptor`

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space.ts:45](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space.ts#L45)

___

### \_dataPipeline

 `Private` `Optional` **\_dataPipeline**: `Pipeline`

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space.ts:56](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space.ts#L56)

___

### \_database

 `Private` `Optional` **\_database**: [`Database`](dxos_echo_db.Database.md)

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space.ts:58](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space.ts#L58)

___

### \_databaseBackend

 `Private` `Optional` **\_databaseBackend**: [`FeedDatabaseBackend`](dxos_echo_db.FeedDatabaseBackend.md)

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space.ts:57](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space.ts#L57)

___

### \_feedProvider

 `Private` `Readonly` **\_feedProvider**: (`feedKey`: `PublicKey`) => `Promise`<`FeedDescriptor`\>

#### Type declaration

(`feedKey`): `Promise`<`FeedDescriptor`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `feedKey` | `PublicKey` |

##### Returns

`Promise`<`FeedDescriptor`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space.ts:47](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space.ts#L47)

___

### \_genesisFeedKey

 `Private` `Readonly` **\_genesisFeedKey**: `PublicKey`

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space.ts:49](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space.ts#L49)

___

### \_isOpen

 `Private` **\_isOpen**: `boolean` = `false`

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space.ts:55](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space.ts#L55)

___

### \_key

 `Private` `Readonly` **\_key**: `PublicKey`

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space.ts:44](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space.ts#L44)

___

### \_protocol

 `Private` `Readonly` **\_protocol**: [`SpaceProtocol`](dxos_echo_db.SpaceProtocol.md)

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space.ts:53](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space.ts#L53)

___

### \_replicator

 `Private` `Readonly` **\_replicator**: [`ReplicatorPlugin`](dxos_echo_db.ReplicatorPlugin.md)

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space.ts:52](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space.ts#L52)

___

### onCredentialProcessed

 `Readonly` **onCredentialProcessed**: `Callback`<`AsyncCallback`<`Credential`\>\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space.ts:42](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space.ts#L42)

## Accessors

### controlFeedKey

`get` **controlFeedKey**(): `PublicKey`

#### Returns

`PublicKey`

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space.ts:141](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space.ts#L141)

___

### controlPipeline

`get` **controlPipeline**(): `PipelineAccessor`

@test-only

#### Returns

`PipelineAccessor`

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space.ts:133](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space.ts#L133)

___

### dataFeedKey

`get` **dataFeedKey**(): `PublicKey`

#### Returns

`PublicKey`

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space.ts:145](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space.ts#L145)

___

### database

`get` **database**(): `undefined` \| [`Database`](dxos_echo_db.Database.md)

#### Returns

`undefined` \| [`Database`](dxos_echo_db.Database.md)

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space.ts:126](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space.ts#L126)

___

### genesisFeedKey

`get` **genesisFeedKey**(): `PublicKey`

#### Returns

`PublicKey`

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space.ts:137](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space.ts#L137)

___

### is_open

`get` **is_open**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space.ts:118](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space.ts#L118)

___

### key

`get` **key**(): `PublicKey`

#### Returns

`PublicKey`

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space.ts:122](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space.ts#L122)

## Methods

### \_closeDataPipeline

`Private` **_closeDataPipeline**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space.ts:247](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space.ts#L247)

___

### \_openDataPipeline

`Private` **_openDataPipeline**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space.ts:179](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space.ts#L179)

___

### close

**close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space.ts:163](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space.ts#L163)

___

### open

**open**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space.ts:149](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space.ts#L149)
