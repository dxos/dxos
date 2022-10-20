# Class: PartySerializer

[@dxos/client](../modules/dxos_client.md).PartySerializer

Import/export party.

## Constructors

### constructor

**new PartySerializer**(`_client`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_client` | [`Client`](dxos_client.Client.md) |

#### Defined in

[packages/sdk/client/src/packlets/proxies/serializer.ts:16](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/serializer.ts#L16)

## Methods

### deserializeParty

**deserializeParty**(`data`): `Promise`<[`Party`](../interfaces/dxos_client.Party.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `Uint8Array` |

#### Returns

`Promise`<[`Party`](../interfaces/dxos_client.Party.md)\>

#### Defined in

[packages/sdk/client/src/packlets/proxies/serializer.ts:25](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/serializer.ts#L25)

___

### serializeParty

**serializeParty**(`party`): `Promise`<`Blob`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `party` | [`Party`](../interfaces/dxos_client.Party.md) |

#### Returns

`Promise`<`Blob`\>

#### Defined in

[packages/sdk/client/src/packlets/proxies/serializer.ts:20](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/serializer.ts#L20)
