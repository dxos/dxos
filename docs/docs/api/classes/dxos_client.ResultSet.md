# Class: ResultSet<T\>

[@dxos/client](../modules/dxos_client.md).ResultSet

Reactive query results.

**`Deprecated`**

## Type parameters

| Name |
| :------ |
| `T` |

## Constructors

### constructor

**new ResultSet**<`T`\>(`itemUpdate`, `getter`)

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `itemUpdate` | `ReadOnlyEvent`<`void`\> |
| `getter` | () => `T`[] |

#### Defined in

packages/echo/echo-db/dist/src/api/result-set.d.ts:14

## Properties

### \_getter

 `Private` `Readonly` **\_getter**: `any`

#### Defined in

packages/echo/echo-db/dist/src/api/result-set.d.ts:9

___

### \_itemUpdate

 `Private` `Readonly` **\_itemUpdate**: `any`

#### Defined in

packages/echo/echo-db/dist/src/api/result-set.d.ts:8

___

### \_resultsUpdate

 `Private` `Readonly` **\_resultsUpdate**: `any`

#### Defined in

packages/echo/echo-db/dist/src/api/result-set.d.ts:7

___

### update

 `Readonly` **update**: `ReadOnlyEvent`<`T`[]\>

Triggered when `value` updates.

#### Defined in

packages/echo/echo-db/dist/src/api/result-set.d.ts:13

## Accessors

### first

`get` **first**(): `T`

#### Returns

`T`

#### Defined in

packages/echo/echo-db/dist/src/api/result-set.d.ts:16

___

### value

`get` **value**(): `T`[]

#### Returns

`T`[]

#### Defined in

packages/echo/echo-db/dist/src/api/result-set.d.ts:15

## Methods

### subscribe

**subscribe**(`listener`): () => `void`

Subscribe for updates.

#### Parameters

| Name | Type |
| :------ | :------ |
| `listener` | (`result`: `T`[]) => `void` |

#### Returns

`fn`

(): `void`

Subscribe for updates.

##### Returns

`void`

#### Defined in

packages/echo/echo-db/dist/src/api/result-set.d.ts:21

___

### waitFor

**waitFor**(`condition`): `Promise`<`T`[]\>

Waits for condition to be true and then returns the value that passed the condition first.

Current value is also checked.

#### Parameters

| Name | Type |
| :------ | :------ |
| `condition` | (`data`: `T`[]) => `boolean` |

#### Returns

`Promise`<`T`[]\>

#### Defined in

packages/echo/echo-db/dist/src/api/result-set.d.ts:27
