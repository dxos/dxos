# Class: SimpleMetrics

[@dxos/credentials](../modules/dxos_credentials.md).SimpleMetrics

A simple class for keeping track of invocations and processing time.

## Constructors

### constructor

**new SimpleMetrics**()

## Properties

### \_counts

 `Private` `Readonly` **\_counts**: `Map`<`string`, `number`\>

#### Defined in

[packages/halo/credentials/src/keys/simple-metrics.ts:12](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/simple-metrics.ts#L12)

___

### \_created

 `Private` `Readonly` **\_created**: `number`

#### Defined in

[packages/halo/credentials/src/keys/simple-metrics.ts:11](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/simple-metrics.ts#L11)

___

### \_times

 `Private` `Readonly` **\_times**: `Map`<`string`, `number`\>

#### Defined in

[packages/halo/credentials/src/keys/simple-metrics.ts:13](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/simple-metrics.ts#L13)

## Methods

### inc

**inc**(`title`): `number`

#### Parameters

| Name | Type |
| :------ | :------ |
| `title` | `string` |

#### Returns

`number`

#### Defined in

[packages/halo/credentials/src/keys/simple-metrics.ts:15](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/simple-metrics.ts#L15)

___

### time

**time**(`title`): () => `number`

#### Parameters

| Name | Type |
| :------ | :------ |
| `title` | `string` |

#### Returns

`fn`

(): `number`

##### Returns

`number`

#### Defined in

[packages/halo/credentials/src/keys/simple-metrics.ts:21](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/simple-metrics.ts#L21)

___

### toString

**toString**(): `string`

#### Returns

`string`

#### Defined in

[packages/halo/credentials/src/keys/simple-metrics.ts:32](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/simple-metrics.ts#L32)
