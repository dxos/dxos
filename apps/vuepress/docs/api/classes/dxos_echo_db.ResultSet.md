# Class: ResultSet<T\>

[@dxos/echo-db](../modules/dxos_echo_db.md).ResultSet

Reactive query results.

**`Deprecated`**

## Type parameters

| Name |
| :------ |
| `T` |

## Table of contents

### Constructors

- [constructor](dxos_echo_db.ResultSet.md#constructor)

### Properties

- [\_getter](dxos_echo_db.ResultSet.md#_getter)
- [\_itemUpdate](dxos_echo_db.ResultSet.md#_itemupdate)
- [\_resultsUpdate](dxos_echo_db.ResultSet.md#_resultsupdate)
- [update](dxos_echo_db.ResultSet.md#update)

### Accessors

- [first](dxos_echo_db.ResultSet.md#first)
- [value](dxos_echo_db.ResultSet.md#value)

### Methods

- [subscribe](dxos_echo_db.ResultSet.md#subscribe)
- [waitFor](dxos_echo_db.ResultSet.md#waitfor)

## Constructors

### constructor

• **new ResultSet**<`T`\>(`itemUpdate`, `getter`)

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

[packages/echo/echo-db/src/api/result-set.ts:24](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/api/result-set.ts#L24)

## Properties

### \_getter

• `Private` `Readonly` **\_getter**: () => `T`[]

#### Type declaration

▸ (): `T`[]

##### Returns

`T`[]

#### Defined in

[packages/echo/echo-db/src/api/result-set.ts:17](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/api/result-set.ts#L17)

___

### \_itemUpdate

• `Private` `Readonly` **\_itemUpdate**: `ReadOnlyEvent`<`void`\>

#### Defined in

[packages/echo/echo-db/src/api/result-set.ts:16](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/api/result-set.ts#L16)

___

### \_resultsUpdate

• `Private` `Readonly` **\_resultsUpdate**: `Event`<`T`[]\>

#### Defined in

[packages/echo/echo-db/src/api/result-set.ts:15](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/api/result-set.ts#L15)

___

### update

• `Readonly` **update**: `ReadOnlyEvent`<`T`[]\>

Triggered when `value` updates.

#### Defined in

[packages/echo/echo-db/src/api/result-set.ts:22](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/api/result-set.ts#L22)

## Accessors

### first

• `get` **first**(): `T`

#### Returns

`T`

#### Defined in

[packages/echo/echo-db/src/api/result-set.ts:40](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/api/result-set.ts#L40)

___

### value

• `get` **value**(): `T`[]

#### Returns

`T`[]

#### Defined in

[packages/echo/echo-db/src/api/result-set.ts:35](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/api/result-set.ts#L35)

## Methods

### subscribe

▸ **subscribe**(`listener`): () => `void`

Subscribe for updates.

#### Parameters

| Name | Type |
| :------ | :------ |
| `listener` | (`result`: `T`[]) => `void` |

#### Returns

`fn`

▸ (): `void`

Register an event listener.

If provided callback was already registered as once-listener, it is made permanent.

##### Returns

`void`

function that unsubscribes this event listener

#### Defined in

[packages/echo/echo-db/src/api/result-set.ts:50](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/api/result-set.ts#L50)

___

### waitFor

▸ **waitFor**(`condition`): `Promise`<`T`[]\>

Waits for condition to be true and then returns the value that passed the condition first.

Current value is also checked.

#### Parameters

| Name | Type |
| :------ | :------ |
| `condition` | (`data`: `T`[]) => `boolean` |

#### Returns

`Promise`<`T`[]\>

#### Defined in

[packages/echo/echo-db/src/api/result-set.ts:59](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/api/result-set.ts#L59)
