# Class: Client

[@dxos/client](../modules/dxos_client.md).Client

## Constructors

### constructor

**new Client**(`config?`, `options?`)

Creates the client object based on supplied configuration.
Requires initialization after creating by calling `.initialize()`.

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `config` | `Config` \| `Config` | `defaultConfig` |
| `options` | [`ClientOptions`](../interfaces/dxos_client.ClientOptions.md) | `{}` |

#### Defined in

[packages/sdk/client/src/packlets/proxies/client.ts:99](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L99)

## Properties

### \_config

 `Private` `Readonly` **\_config**: `Config`

#### Defined in

[packages/sdk/client/src/packlets/proxies/client.ts:83](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L83)

___

### \_echo

 `Private` **\_echo**: [`EchoProxy`](dxos_client.EchoProxy.md)

#### Defined in

[packages/sdk/client/src/packlets/proxies/client.ts:90](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L90)

___

### \_halo

 `Private` **\_halo**: [`HaloProxy`](dxos_client.HaloProxy.md)

#### Defined in

[packages/sdk/client/src/packlets/proxies/client.ts:89](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L89)

___

### \_initialized

 `Private` **\_initialized**: `boolean` = `false`

#### Defined in

[packages/sdk/client/src/packlets/proxies/client.ts:87](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L87)

___

### \_mode

 `Private` `Readonly` **\_mode**: `Mode`

#### Defined in

[packages/sdk/client/src/packlets/proxies/client.ts:85](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L85)

___

### \_options

 `Private` `Readonly` **\_options**: [`ClientOptions`](../interfaces/dxos_client.ClientOptions.md)

#### Defined in

[packages/sdk/client/src/packlets/proxies/client.ts:84](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L84)

___

### \_serviceProvider

 `Private` **\_serviceProvider**: `ClientServiceProvider`

#### Defined in

[packages/sdk/client/src/packlets/proxies/client.ts:88](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L88)

___

### version

 `Readonly` **version**: ``"2.33.8"``

#### Defined in

[packages/sdk/client/src/packlets/proxies/client.ts:81](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L81)

## Accessors

### config

`get` **config**(): `Config`

#### Returns

`Config`

#### Defined in

[packages/sdk/client/src/packlets/proxies/client.ts:131](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L131)

___

### echo

`get` **echo**(): [`EchoProxy`](dxos_client.EchoProxy.md)

ECHO database.

#### Returns

[`EchoProxy`](dxos_client.EchoProxy.md)

#### Defined in

[packages/sdk/client/src/packlets/proxies/client.ts:146](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L146)

___

### halo

`get` **halo**(): [`HaloProxy`](dxos_client.HaloProxy.md)

HALO credentials.

#### Returns

[`HaloProxy`](dxos_client.HaloProxy.md)

#### Defined in

[packages/sdk/client/src/packlets/proxies/client.ts:154](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L154)

___

### info

`get` **info**(): [`ClientInfo`](../interfaces/dxos_client.ClientInfo.md)

#### Returns

[`ClientInfo`](../interfaces/dxos_client.ClientInfo.md)

#### Defined in

[packages/sdk/client/src/packlets/proxies/client.ts:123](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L123)

___

### initialized

`get` **initialized**(): `boolean`

Has the Client been initialized?
Initialize by calling `.initialize()`

#### Returns

`boolean`

#### Defined in

[packages/sdk/client/src/packlets/proxies/client.ts:139](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L139)

___

### services

`get` **services**(): `ClientServices`

Client services that can be proxied.

#### Returns

`ClientServices`

#### Defined in

[packages/sdk/client/src/packlets/proxies/client.ts:165](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L165)

## Methods

### destroy

**destroy**(): `Promise`<`void`\>

Cleanup, release resources.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/proxies/client.ts:252](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L252)

___

### initialize

**initialize**(`onProgressCallback?`): `Promise`<`void`\>

Initializes internal resources in an idempotent way.
Required before using the Client instance.

#### Parameters

| Name | Type |
| :------ | :------ |
| `onProgressCallback?` | (`progress`: `any`) => `void` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/proxies/client.ts:173](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L173)

___

### initializeAuto

`Private` **initializeAuto**(`onProgressCallback`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `onProgressCallback` | `undefined` \| (`progress`: `any`) => `void` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/proxies/client.ts:230](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L230)

___

### initializeIFramePort

`Private` **initializeIFramePort**(): `RpcPort`

#### Returns

`RpcPort`

#### Defined in

[packages/sdk/client/src/packlets/proxies/client.ts:207](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L207)

___

### initializeLocal

`Private` **initializeLocal**(`onProgressCallback`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `onProgressCallback` | `undefined` \| (`progress`: `any`) => `void` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/proxies/client.ts:224](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L224)

___

### initializeRemote

`Private` **initializeRemote**(`onProgressCallback`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `onProgressCallback` | `undefined` \| (`progress`: `any`) => `void` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/proxies/client.ts:213](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L213)

___

### registerModel

**registerModel**(`constructor`): [`Client`](dxos_client.Client.md)

Registers a new ECHO model.

**`Deprecated`**

#### Parameters

| Name | Type |
| :------ | :------ |
| `constructor` | `ModelConstructor`<`any`\> |

#### Returns

[`Client`](dxos_client.Client.md)

#### Defined in

[packages/sdk/client/src/packlets/proxies/client.ts:283](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L283)

___

### reset

**reset**(): `Promise`<`void`\>

Resets and destroys client storage.
Warning: Inconsistent state after reset, do not continue to use this client instance.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/proxies/client.ts:271](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L271)

___

### toString

**toString**(): `string`

#### Returns

`string`

#### Defined in

[packages/sdk/client/src/packlets/proxies/client.ts:119](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L119)
