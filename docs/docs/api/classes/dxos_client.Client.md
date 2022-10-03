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

[packages/sdk/client/src/packlets/proxy/client.ts:95](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxy/client.ts#L95)

## Properties

### \_config

 `Private` `Readonly` **\_config**: `Config`

#### Defined in

[packages/sdk/client/src/packlets/proxy/client.ts:79](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxy/client.ts#L79)

___

### \_echo

 `Private` **\_echo**: [`EchoProxy`](dxos_client.EchoProxy.md)

#### Defined in

[packages/sdk/client/src/packlets/proxy/client.ts:86](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxy/client.ts#L86)

___

### \_halo

 `Private` **\_halo**: [`HaloProxy`](dxos_client.HaloProxy.md)

#### Defined in

[packages/sdk/client/src/packlets/proxy/client.ts:85](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxy/client.ts#L85)

___

### \_initialized

 `Private` **\_initialized**: `boolean` = `false`

#### Defined in

[packages/sdk/client/src/packlets/proxy/client.ts:83](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxy/client.ts#L83)

___

### \_mode

 `Private` `Readonly` **\_mode**: `Mode`

#### Defined in

[packages/sdk/client/src/packlets/proxy/client.ts:81](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxy/client.ts#L81)

___

### \_options

 `Private` `Readonly` **\_options**: [`ClientOptions`](../interfaces/dxos_client.ClientOptions.md)

#### Defined in

[packages/sdk/client/src/packlets/proxy/client.ts:80](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxy/client.ts#L80)

___

### \_serviceProvider

 `Private` **\_serviceProvider**: [`ClientServiceProvider`](../interfaces/dxos_client.ClientServiceProvider.md)

#### Defined in

[packages/sdk/client/src/packlets/proxy/client.ts:84](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxy/client.ts#L84)

___

### version

 `Readonly` **version**: ``"2.33.8"``

#### Defined in

[packages/sdk/client/src/packlets/proxy/client.ts:77](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxy/client.ts#L77)

## Accessors

### config

`get` **config**(): `Config`

#### Returns

`Config`

#### Defined in

[packages/sdk/client/src/packlets/proxy/client.ts:127](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxy/client.ts#L127)

___

### echo

`get` **echo**(): [`EchoProxy`](dxos_client.EchoProxy.md)

ECHO database.

#### Returns

[`EchoProxy`](dxos_client.EchoProxy.md)

#### Defined in

[packages/sdk/client/src/packlets/proxy/client.ts:142](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxy/client.ts#L142)

___

### halo

`get` **halo**(): [`HaloProxy`](dxos_client.HaloProxy.md)

HALO credentials.

#### Returns

[`HaloProxy`](dxos_client.HaloProxy.md)

#### Defined in

[packages/sdk/client/src/packlets/proxy/client.ts:150](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxy/client.ts#L150)

___

### info

`get` **info**(): [`ClientInfo`](../interfaces/dxos_client.ClientInfo.md)

#### Returns

[`ClientInfo`](../interfaces/dxos_client.ClientInfo.md)

#### Defined in

[packages/sdk/client/src/packlets/proxy/client.ts:119](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxy/client.ts#L119)

___

### initialized

`get` **initialized**(): `boolean`

Has the Client been initialized?
Initialize by calling `.initialize()`

#### Returns

`boolean`

#### Defined in

[packages/sdk/client/src/packlets/proxy/client.ts:135](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxy/client.ts#L135)

___

### services

`get` **services**(): [`ClientServices`](../types/dxos_client.ClientServices.md)

Client services that can be proxied.

#### Returns

[`ClientServices`](../types/dxos_client.ClientServices.md)

#### Defined in

[packages/sdk/client/src/packlets/proxy/client.ts:161](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxy/client.ts#L161)

## Methods

### destroy

**destroy**(): `Promise`<`void`\>

Cleanup, release resources.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/proxy/client.ts:248](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxy/client.ts#L248)

___

### initialize

**initialize**(`onProgressCallback?`): `Promise`<`void`\>

Initializes internal resources in an idempotent way.
Required before using the Client instance.

#### Parameters

| Name | Type |
| :------ | :------ |
| `onProgressCallback?` | (`progress`: [`OpenProgress`](../interfaces/dxos_client.OpenProgress.md)) => `void` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/proxy/client.ts:169](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxy/client.ts#L169)

___

### initializeAuto

`Private` **initializeAuto**(`onProgressCallback`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `onProgressCallback` | `undefined` \| (`progress`: [`OpenProgress`](../interfaces/dxos_client.OpenProgress.md)) => `void` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/proxy/client.ts:226](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxy/client.ts#L226)

___

### initializeIFramePort

`Private` **initializeIFramePort**(): `RpcPort`

#### Returns

`RpcPort`

#### Defined in

[packages/sdk/client/src/packlets/proxy/client.ts:203](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxy/client.ts#L203)

___

### initializeLocal

`Private` **initializeLocal**(`onProgressCallback`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `onProgressCallback` | `undefined` \| (`progress`: [`OpenProgress`](../interfaces/dxos_client.OpenProgress.md)) => `void` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/proxy/client.ts:220](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxy/client.ts#L220)

___

### initializeRemote

`Private` **initializeRemote**(`onProgressCallback`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `onProgressCallback` | `undefined` \| (`progress`: [`OpenProgress`](../interfaces/dxos_client.OpenProgress.md)) => `void` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/proxy/client.ts:209](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxy/client.ts#L209)

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

[packages/sdk/client/src/packlets/proxy/client.ts:279](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxy/client.ts#L279)

___

### reset

**reset**(): `Promise`<`void`\>

Resets and destroys client storage.
Warning: Inconsistent state after reset, do not continue to use this client instance.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/proxy/client.ts:267](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxy/client.ts#L267)

___

### toString

**toString**(): `string`

#### Returns

`string`

#### Defined in

[packages/sdk/client/src/packlets/proxy/client.ts:115](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxy/client.ts#L115)
