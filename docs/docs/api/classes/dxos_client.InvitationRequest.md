# Class: InvitationRequest

[@dxos/client](../modules/dxos_client.md).InvitationRequest

Invitation created by sender.

## Constructors

### constructor

**new InvitationRequest**(`_descriptor`, `connected`, `finished`, `error`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_descriptor` | [`InvitationDescriptor`](dxos_client.InvitationDescriptor.md) |
| `connected` | `Event`<`void`\> |
| `finished` | `Event`<`void`\> |
| `error` | `Event`<`Error`\> |

#### Defined in

[packages/sdk/client/src/packlets/api/invitations/invitation-request.ts:39](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/invitations/invitation-request.ts#L39)

## Properties

### \_hasConnected

 `Private` **\_hasConnected**: `boolean` = `false`

#### Defined in

[packages/sdk/client/src/packlets/api/invitations/invitation-request.ts:15](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/invitations/invitation-request.ts#L15)

___

### \_isCanceled

 `Private` **\_isCanceled**: `boolean` = `false`

#### Defined in

[packages/sdk/client/src/packlets/api/invitations/invitation-request.ts:17](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/invitations/invitation-request.ts#L17)

___

### canceled

 `Readonly` **canceled**: `Event`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/api/invitations/invitation-request.ts:37](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/invitations/invitation-request.ts#L37)

___

### connected

 `Readonly` **connected**: `Event`<`void`\>

Fired when the remote peer connects.

#### Defined in

[packages/sdk/client/src/packlets/api/invitations/invitation-request.ts:24](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/invitations/invitation-request.ts#L24)

___

### error

 `Readonly` **error**: `Event`<`Error`\>

Fired when there's an error in the invitation process.

#### Defined in

[packages/sdk/client/src/packlets/api/invitations/invitation-request.ts:35](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/invitations/invitation-request.ts#L35)

___

### finished

 `Readonly` **finished**: `Event`<`void`\>

Fired when the invitation process completes successfully.

#### Defined in

[packages/sdk/client/src/packlets/api/invitations/invitation-request.ts:29](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/invitations/invitation-request.ts#L29)

## Accessors

### descriptor

`get` **descriptor**(): [`InvitationDescriptor`](dxos_client.InvitationDescriptor.md)

#### Returns

[`InvitationDescriptor`](dxos_client.InvitationDescriptor.md)

#### Defined in

[packages/sdk/client/src/packlets/api/invitations/invitation-request.ts:54](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/invitations/invitation-request.ts#L54)

___

### hasConnected

`get` **hasConnected**(): `boolean`

True if the connected event has been fired.

#### Returns

`boolean`

#### Defined in

[packages/sdk/client/src/packlets/api/invitations/invitation-request.ts:65](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/invitations/invitation-request.ts#L65)

___

### secret

`get` **secret**(): `Uint8Array`

#### Returns

`Uint8Array`

#### Defined in

[packages/sdk/client/src/packlets/api/invitations/invitation-request.ts:58](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/invitations/invitation-request.ts#L58)

## Methods

### cancel

**cancel**(): `void`

Cancel the invitation.

#### Returns

`void`

#### Defined in

[packages/sdk/client/src/packlets/api/invitations/invitation-request.ts:83](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/invitations/invitation-request.ts#L83)

___

### toString

**toString**(): `string`

#### Returns

`string`

#### Defined in

[packages/sdk/client/src/packlets/api/invitations/invitation-request.ts:89](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/invitations/invitation-request.ts#L89)

___

### wait

**wait**(`timeout?`): `Promise`<`void`\>

Wait until connected.

#### Parameters

| Name | Type |
| :------ | :------ |
| `timeout?` | `number` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/api/invitations/invitation-request.ts:72](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/invitations/invitation-request.ts#L72)
