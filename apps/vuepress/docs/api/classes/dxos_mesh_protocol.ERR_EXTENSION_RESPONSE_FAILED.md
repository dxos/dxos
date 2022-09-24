# Class: ERR\_EXTENSION\_RESPONSE\_FAILED

[@dxos/mesh-protocol](../modules/dxos_mesh_protocol.md).ERR_EXTENSION_RESPONSE_FAILED

## Hierarchy

- `Nanoerror`<`this`\>

  ↳ **`ERR_EXTENSION_RESPONSE_FAILED`**

## Table of contents

### Constructors

- [constructor](dxos_mesh_protocol.ERR_EXTENSION_RESPONSE_FAILED.md#constructor)

### Properties

- [cause](dxos_mesh_protocol.ERR_EXTENSION_RESPONSE_FAILED.md#cause)
- [extension](dxos_mesh_protocol.ERR_EXTENSION_RESPONSE_FAILED.md#extension)
- [isNanoerror](dxos_mesh_protocol.ERR_EXTENSION_RESPONSE_FAILED.md#isnanoerror)
- [message](dxos_mesh_protocol.ERR_EXTENSION_RESPONSE_FAILED.md#message)
- [name](dxos_mesh_protocol.ERR_EXTENSION_RESPONSE_FAILED.md#name)
- [responseCode](dxos_mesh_protocol.ERR_EXTENSION_RESPONSE_FAILED.md#responsecode)
- [responseMessage](dxos_mesh_protocol.ERR_EXTENSION_RESPONSE_FAILED.md#responsemessage)
- [stack](dxos_mesh_protocol.ERR_EXTENSION_RESPONSE_FAILED.md#stack)
- [prepareStackTrace](dxos_mesh_protocol.ERR_EXTENSION_RESPONSE_FAILED.md#preparestacktrace)
- [stackTraceLimit](dxos_mesh_protocol.ERR_EXTENSION_RESPONSE_FAILED.md#stacktracelimit)

### Methods

- [captureStackTrace](dxos_mesh_protocol.ERR_EXTENSION_RESPONSE_FAILED.md#capturestacktrace)
- [equals](dxos_mesh_protocol.ERR_EXTENSION_RESPONSE_FAILED.md#equals)
- [from](dxos_mesh_protocol.ERR_EXTENSION_RESPONSE_FAILED.md#from)

## Constructors

### constructor

• **new ERR_EXTENSION_RESPONSE_FAILED**(`extension`, `responseCode`, `responseMessage`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `extension` | `string` |
| `responseCode` | `string` |
| `responseMessage` | `string` |

#### Overrides

nanoerror(&#x27;ERR\_EXTENSION\_RESPONSE\_FAILED&#x27;, &#x27;[extension: %s] [responseCode: %s] [message: %s]&#x27;).constructor

#### Defined in

[packages/mesh/mesh-protocol/src/errors.ts:20](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/errors.ts#L20)

## Properties

### cause

• `Optional` **cause**: `Error`

#### Inherited from

nanoerror('ERR\_EXTENSION\_RESPONSE\_FAILED', '[extension: %s] [responseCode: %s] [message: %s]').cause

#### Defined in

node_modules/.pnpm/typescript@4.7.4/node_modules/typescript/lib/lib.es2022.error.d.ts:26

___

### extension

• `Readonly` **extension**: `string`

#### Defined in

[packages/mesh/mesh-protocol/src/errors.ts:21](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/errors.ts#L21)

___

### isNanoerror

• **isNanoerror**: ``true``

#### Inherited from

nanoerror('ERR\_EXTENSION\_RESPONSE\_FAILED', '[extension: %s] [responseCode: %s] [message: %s]').isNanoerror

#### Defined in

[packages/mesh/mesh-protocol/src/shims.d.ts:12](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/shims.d.ts#L12)

___

### message

• **message**: `string`

#### Inherited from

nanoerror('ERR\_EXTENSION\_RESPONSE\_FAILED', '[extension: %s] [responseCode: %s] [message: %s]').message

#### Defined in

node_modules/.pnpm/typescript@4.7.4/node_modules/typescript/lib/lib.es5.d.ts:1029

___

### name

• **name**: `string`

#### Inherited from

nanoerror('ERR\_EXTENSION\_RESPONSE\_FAILED', '[extension: %s] [responseCode: %s] [message: %s]').name

#### Defined in

node_modules/.pnpm/typescript@4.7.4/node_modules/typescript/lib/lib.es5.d.ts:1028

___

### responseCode

• `Readonly` **responseCode**: `string`

#### Defined in

[packages/mesh/mesh-protocol/src/errors.ts:22](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/errors.ts#L22)

___

### responseMessage

• `Readonly` **responseMessage**: `string`

#### Defined in

[packages/mesh/mesh-protocol/src/errors.ts:23](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/errors.ts#L23)

___

### stack

• `Optional` **stack**: `string`

#### Inherited from

nanoerror('ERR\_EXTENSION\_RESPONSE\_FAILED', '[extension: %s] [responseCode: %s] [message: %s]').stack

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

nanoerror('ERR\_EXTENSION\_RESPONSE\_FAILED', '[extension: %s] [responseCode: %s] [message: %s]').prepareStackTrace

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/globals.d.ts:11

___

### stackTraceLimit

▪ `Static` **stackTraceLimit**: `number`

#### Inherited from

nanoerror('ERR\_EXTENSION\_RESPONSE\_FAILED', '[extension: %s] [responseCode: %s] [message: %s]').stackTraceLimit

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

nanoerror('ERR\_EXTENSION\_RESPONSE\_FAILED', '[extension: %s] [responseCode: %s] [message: %s]').captureStackTrace

#### Defined in

node_modules/.pnpm/@types+node@16.11.27/node_modules/@types/node/globals.d.ts:4

___

### equals

▸ `Static` **equals**(`error`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | `any` |

#### Returns

`boolean`

#### Inherited from

nanoerror('ERR\_EXTENSION\_RESPONSE\_FAILED', '[extension: %s] [responseCode: %s] [message: %s]').equals

#### Defined in

[packages/mesh/mesh-protocol/src/shims.d.ts:9](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/shims.d.ts#L9)

___

### from

▸ `Static` **from**(`error`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | `any` |

#### Returns

`any`

#### Inherited from

nanoerror('ERR\_EXTENSION\_RESPONSE\_FAILED', '[extension: %s] [responseCode: %s] [message: %s]').from

#### Defined in

[packages/mesh/mesh-protocol/src/shims.d.ts:10](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/mesh-protocol/src/shims.d.ts#L10)
