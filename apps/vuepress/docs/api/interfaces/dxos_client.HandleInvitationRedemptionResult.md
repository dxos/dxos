# Interface: HandleInvitationRedemptionResult

[@dxos/client](../modules/dxos_client.md).HandleInvitationRedemptionResult

## Table of contents

### Properties

- [authenticate](dxos_client.HandleInvitationRedemptionResult.md#authenticate)
- [waitForFinish](dxos_client.HandleInvitationRedemptionResult.md#waitforfinish)

## Properties

### authenticate

• **authenticate**: (`secret`: `Uint8Array`) => `void`

#### Type declaration

▸ (`secret`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `secret` | `Uint8Array` |

##### Returns

`void`

#### Defined in

[packages/sdk/client/src/packlets/proxy/invitation-proxy.ts:34](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/invitation-proxy.ts#L34)

___

### waitForFinish

• **waitForFinish**: () => `Promise`<`RedeemedInvitation`\>

#### Type declaration

▸ (): `Promise`<`RedeemedInvitation`\>

##### Returns

`Promise`<`RedeemedInvitation`\>

#### Defined in

[packages/sdk/client/src/packlets/proxy/invitation-proxy.ts:33](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/client/src/packlets/proxy/invitation-proxy.ts#L33)
