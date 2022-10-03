# Class: SerializedRpcError

[@dxos/rpc](../modules/dxos_rpc.md).SerializedRpcError

Error that is reconstructed after being sent over the RPC boundary.

## Hierarchy

- `Error`

  ↳ **`SerializedRpcError`**

## Constructors

### constructor

**new SerializedRpcError**(`name`, `message`, `remoteStack`, `rpcMethod`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `message` | `string` |
| `remoteStack` | `string` |
| `rpcMethod` | `string` |

#### Overrides

Error.constructor

#### Defined in

[packages/core/mesh/rpc/src/errors.ts:9](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/errors.ts#L9)

## Properties

### cause

 `Optional` **cause**: `Error`

#### Inherited from

Error.cause

#### Defined in

node_modules/.pnpm/typescript@4.7.4/node_modules/typescript/lib/lib.es2022.error.d.ts:26

___

### message

 **message**: `string`

#### Inherited from

Error.message

#### Defined in

node_modules/.pnpm/typescript@4.7.4/node_modules/typescript/lib/lib.es5.d.ts:1029

___

### name

 **name**: `string`

#### Inherited from

Error.name

#### Defined in

node_modules/.pnpm/typescript@4.7.4/node_modules/typescript/lib/lib.es5.d.ts:1028

___

### remoteStack

 `Readonly` **remoteStack**: `string`

#### Defined in

[packages/core/mesh/rpc/src/errors.ts:9](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/errors.ts#L9)

___

### rpcMethod

 `Readonly` **rpcMethod**: `string`

#### Defined in

[packages/core/mesh/rpc/src/errors.ts:9](https://github.com/dxos/dxos/blob/main/packages/core/mesh/rpc/src/errors.ts#L9)

___

### stack

 `Optional` **stack**: `string`

#### Inherited from

Error.stack

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

Error.prepareStackTrace

#### Defined in

node_modules/.pnpm/@types+node@16.11.62/node_modules/@types/node/ts4.8/globals.d.ts:11

___

### stackTraceLimit

 `Static` **stackTraceLimit**: `number`

#### Inherited from

Error.stackTraceLimit

#### Defined in

node_modules/.pnpm/@types+node@16.11.62/node_modules/@types/node/ts4.8/globals.d.ts:13

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

Error.captureStackTrace

#### Defined in

node_modules/.pnpm/@types+node@16.11.62/node_modules/@types/node/ts4.8/globals.d.ts:4
