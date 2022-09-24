# Class: InvalidStorageVersionError

[@dxos/echo-db](../modules/dxos_echo_db.md).InvalidStorageVersionError

## Hierarchy

- `DXOSError`

  ↳ **`InvalidStorageVersionError`**

## Table of contents

### Constructors

- [constructor](dxos_echo_db.InvalidStorageVersionError.md#constructor)

### Properties

- [cause](dxos_echo_db.InvalidStorageVersionError.md#cause)
- [code](dxos_echo_db.InvalidStorageVersionError.md#code)
- [dxosErrorMessage](dxos_echo_db.InvalidStorageVersionError.md#dxoserrormessage)
- [message](dxos_echo_db.InvalidStorageVersionError.md#message)
- [name](dxos_echo_db.InvalidStorageVersionError.md#name)
- [stack](dxos_echo_db.InvalidStorageVersionError.md#stack)
- [prepareStackTrace](dxos_echo_db.InvalidStorageVersionError.md#preparestacktrace)
- [stackTraceLimit](dxos_echo_db.InvalidStorageVersionError.md#stacktracelimit)

### Methods

- [captureStackTrace](dxos_echo_db.InvalidStorageVersionError.md#capturestacktrace)

## Constructors

### constructor

• **new InvalidStorageVersionError**(`expected`, `actual`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `expected` | `number` |
| `actual` | `number` |

#### Overrides

DXOSError.constructor

#### Defined in

[packages/echo/echo-db/src/packlets/errors/errors.ts:40](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/packlets/errors/errors.ts#L40)

## Properties

### cause

• `Optional` **cause**: `Error`

#### Inherited from

DXOSError.cause

#### Defined in

node_modules/.pnpm/typescript@4.7.4/node_modules/typescript/lib/lib.es2022.error.d.ts:26

___

### code

• `Readonly` **code**: `string`

#### Inherited from

DXOSError.code

#### Defined in

packages/common/debug/dist/src/errors/dxos-error.d.ts:7

___

### dxosErrorMessage

• `Optional` `Readonly` **dxosErrorMessage**: `string`

#### Inherited from

DXOSError.dxosErrorMessage

#### Defined in

packages/common/debug/dist/src/errors/dxos-error.d.ts:8

___

### message

• **message**: `string`

#### Inherited from

DXOSError.message

#### Defined in

node_modules/.pnpm/typescript@4.7.4/node_modules/typescript/lib/lib.es5.d.ts:1029

___

### name

• **name**: `string`

#### Inherited from

DXOSError.name

#### Defined in

node_modules/.pnpm/typescript@4.7.4/node_modules/typescript/lib/lib.es5.d.ts:1028

___

### stack

• `Optional` **stack**: `string`

#### Inherited from

DXOSError.stack

#### Defined in

node_modules/.pnpm/typescript@4.7.4/node_modules/typescript/lib/lib.es5.d.ts:1030

___

### prepareStackTrace

▪ `Static` `Optional` **prepareStackTrace**: (`err`: `Error`, `stackTraces`: `CallSite`[]) => `any`

#### Type declaration

▸ (`err`, `stackTraces`): `any`

Optional override for formatting stack traces

**`See`**

https://v8.dev/docs/stack-trace-api#customizing-stack-traces

##### Parameters

| Name | Type |
| :------ | :------ |
| `err` | `Error` |
| `stackTraces` | `CallSite`[] |

##### Returns

`any`

#### Inherited from

DXOSError.prepareStackTrace

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/globals.d.ts:11

___

### stackTraceLimit

▪ `Static` **stackTraceLimit**: `number`

#### Inherited from

DXOSError.stackTraceLimit

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/globals.d.ts:13

## Methods

### captureStackTrace

▸ `Static` **captureStackTrace**(`targetObject`, `constructorOpt?`): `void`

Create .stack property on a target object

#### Parameters

| Name | Type |
| :------ | :------ |
| `targetObject` | `object` |
| `constructorOpt?` | `Function` |

#### Returns

`void`

#### Inherited from

DXOSError.captureStackTrace

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/globals.d.ts:4
