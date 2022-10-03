# Interface: HaloSigner

[@dxos/client](../modules/dxos_client.md).HaloSigner

Signer plugin.

## Properties

### sign

 **sign**: (`request`: [`SignRequest`](dxos_client.SignRequest.md), `key`: [`KeyRecord`](dxos_client.KeyRecord.md)) => `Promise`<[`SignResponse`](dxos_client.SignResponse.md)\>

#### Type declaration

(`request`, `key`): `Promise`<[`SignResponse`](dxos_client.SignResponse.md)\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `request` | [`SignRequest`](dxos_client.SignRequest.md) |
| `key` | [`KeyRecord`](dxos_client.KeyRecord.md) |

##### Returns

`Promise`<[`SignResponse`](dxos_client.SignResponse.md)\>

#### Defined in

[packages/sdk/client/src/packlets/api/halo.ts:17](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/halo.ts#L17)
