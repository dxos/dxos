# Interface: InvitationOptions

[@dxos/client-services](../modules/dxos_client_services.md).InvitationOptions

Additional set of callbacks and options used in the invitation process.

## Properties

### expiration

 `Optional` **expiration**: `number`

Date.now()-style timestamp of when this invitation should expire.

#### Defined in

[packages/sdk/client-services/src/packlets/invitations/common.ts:32](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/invitations/common.ts#L32)

___

### onFinish

 `Optional` **onFinish**: (`__namedParameters`: { `expired?`: `boolean`  }) => `void`

#### Type declaration

(`__namedParameters`): `void`

A function to be called when the invitation is closed (successfully or not).

##### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.expired?` | `boolean` |

##### Returns

`void`

#### Defined in

[packages/sdk/client-services/src/packlets/invitations/common.ts:27](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/invitations/common.ts#L27)
