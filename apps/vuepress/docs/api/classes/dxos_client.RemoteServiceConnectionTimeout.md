# Class: RemoteServiceConnectionTimeout

[@dxos/client](../modules/dxos_client.md).RemoteServiceConnectionTimeout

## Hierarchy

- `DXOSError`

  ↳ **`RemoteServiceConnectionTimeout`**

## Constructors

### constructor

**new RemoteServiceConnectionTimeout**(`message?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `message?` | `string` |

#### Overrides

DXOSError.constructor

#### Defined in

[packages/sdk/client/src/packlets/api/errors.ts:14](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/errors.ts#L14)

## Properties

### cause

 `Optional` **cause**: `Error`

#### Inherited from

DXOSError.cause

#### Defined in

node_modules/.pnpm/typescript@4.7.4/node_modules/typescript/lib/lib.es2022.error.d.ts:26

___

### code

 `Readonly` **code**: `string`

#### Inherited from

DXOSError.code

#### Defined in

packages/common/debug/dist/src/errors/dxos-error.d.ts:7

___

### dxosErrorMessage

 `Optional` `Readonly` **dxosErrorMessage**: `string`

#### Inherited from

DXOSError.dxosErrorMessage

#### Defined in

packages/common/debug/dist/src/errors/dxos-error.d.ts:8

___

### message

 **message**: `string`

#### Inherited from

DXOSError.message

#### Defined in

node_modules/.pnpm/typescript@4.7.4/node_modules/typescript/lib/lib.es5.d.ts:1029

___

### name

 **name**: `string`

#### Inherited from

DXOSError.name

#### Defined in

node_modules/.pnpm/typescript@4.7.4/node_modules/typescript/lib/lib.es5.d.ts:1028

___

### stack

 `Optional` **stack**: `string`

#### Inherited from

DXOSError.stack

#### Defined in

node_modules/.pnpm/typescript@4.7.4/node_modules/typescript/lib/lib.es5.d.ts:1030

___

### prepareStackTrace

 `Static` `Optional` **prepareStackTrace**: (`err`: `Error`, `stackTraces`: `CallSite`[]) => `any`

#### Type declaration

(`err`, `stackTraces`): `any`

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

 `Static` **stackTraceLimit**: `number`

#### Inherited from

DXOSError.stackTraceLimit

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/globals.d.ts:13

## Methods

### captureStackTrace

`Static` **captureStackTrace**(`targetObject`, `constructorOpt?`): `void`

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
