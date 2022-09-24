# Interface: HaloSigner

[@dxos/client](../modules/dxos_client.md).HaloSigner

Signer plugin.

## Table of contents

### Properties

- [sign](dxos_client.HaloSigner.md#sign)

## Properties

### sign

• **sign**: (`request`: [`SignRequest`](dxos_client.SignRequest.md), `key`: [`KeyRecord`](dxos_client.KeyRecord.md)) => `Promise`<[`SignResponse`](dxos_client.SignResponse.md)\>

#### Type declaration

▸ (`request`, `key`): `Promise`<[`SignResponse`](dxos_client.SignResponse.md)\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `request` | [`SignRequest`](dxos_client.SignRequest.md) |
| `key` | [`KeyRecord`](dxos_client.KeyRecord.md) |

##### Returns

`Promise`<[`SignResponse`](dxos_client.SignResponse.md)\>

#### Defined in

[packages/sdk/client/src/packlets/api/halo.ts:17](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client/src/packlets/api/halo.ts#L17)
