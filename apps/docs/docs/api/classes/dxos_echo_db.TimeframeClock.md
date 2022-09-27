---
id: "dxos_echo_db.TimeframeClock"
title: "Class: TimeframeClock"
sidebar_label: "TimeframeClock"
custom_edit_url: null
---

[@dxos/echo-db](../modules/dxos_echo_db.md).TimeframeClock

Keeps state of the last timeframe that was processed by ECHO.

## Constructors

### constructor

• **new TimeframeClock**(`_timeframe?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_timeframe` | `Timeframe` |

#### Defined in

[packages/echo/echo-db/src/packlets/database/timeframe-clock.ts:16](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/echo-db/src/packlets/database/timeframe-clock.ts#L16)

## Properties

### update

• `Readonly` **update**: `Event`<`Timeframe`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/timeframe-clock.ts:14](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/echo-db/src/packlets/database/timeframe-clock.ts#L14)

## Accessors

### timeframe

• `get` **timeframe**(): `Timeframe`

#### Returns

`Timeframe`

#### Defined in

[packages/echo/echo-db/src/packlets/database/timeframe-clock.ts:20](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/echo-db/src/packlets/database/timeframe-clock.ts#L20)

## Methods

### hasGaps

▸ **hasGaps**(`timeframe`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `timeframe` | `Timeframe` |

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/packlets/database/timeframe-clock.ts:29](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/echo-db/src/packlets/database/timeframe-clock.ts#L29)

___

### updateTimeframe

▸ **updateTimeframe**(`key`, `seq`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `PublicKey` |
| `seq` | `number` |

#### Returns

`void`

#### Defined in

[packages/echo/echo-db/src/packlets/database/timeframe-clock.ts:24](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/echo-db/src/packlets/database/timeframe-clock.ts#L24)

___

### waitUntilReached

▸ **waitUntilReached**(`target`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `target` | `Timeframe` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/timeframe-clock.ts:34](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/echo-db/src/packlets/database/timeframe-clock.ts#L34)
