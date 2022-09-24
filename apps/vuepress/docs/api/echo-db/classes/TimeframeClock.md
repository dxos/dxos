# Class: TimeframeClock

Keeps state of the last timeframe that was processed by ECHO.

## Table of contents

### Constructors

- [constructor](TimeframeClock.md#constructor)

### Properties

- [update](TimeframeClock.md#update)

### Accessors

- [timeframe](TimeframeClock.md#timeframe)

### Methods

- [hasGaps](TimeframeClock.md#hasgaps)
- [updateTimeframe](TimeframeClock.md#updatetimeframe)
- [waitUntilReached](TimeframeClock.md#waituntilreached)

## Constructors

### constructor

• **new TimeframeClock**(`_timeframe?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_timeframe` | `Timeframe` |

#### Defined in

[packages/echo/echo-db/src/packlets/database/timeframe-clock.ts:16](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/timeframe-clock.ts#L16)

## Properties

### update

• `Readonly` **update**: `Event`<`Timeframe`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/timeframe-clock.ts:14](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/timeframe-clock.ts#L14)

## Accessors

### timeframe

• `get` **timeframe**(): `Timeframe`

#### Returns

`Timeframe`

#### Defined in

[packages/echo/echo-db/src/packlets/database/timeframe-clock.ts:20](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/timeframe-clock.ts#L20)

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

[packages/echo/echo-db/src/packlets/database/timeframe-clock.ts:29](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/timeframe-clock.ts#L29)

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

[packages/echo/echo-db/src/packlets/database/timeframe-clock.ts:24](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/timeframe-clock.ts#L24)

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

[packages/echo/echo-db/src/packlets/database/timeframe-clock.ts:34](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/timeframe-clock.ts#L34)
