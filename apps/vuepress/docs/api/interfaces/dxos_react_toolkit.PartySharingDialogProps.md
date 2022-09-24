# Interface: PartySharingDialogProps

[@dxos/react-toolkit](../modules/dxos_react_toolkit.md).PartySharingDialogProps

## Hierarchy

- `Omit`<[`SharingDialogProps`](dxos_react_toolkit.SharingDialogProps.md), ``"title"`` \| ``"members"`` \| ``"onCreateInvitation"`` \| ``"onCancelInvitation"`` \| ``"onCreateBotInvitation"``\>

  ↳ **`PartySharingDialogProps`**

## Table of contents

### Properties

- [createUrl](dxos_react_toolkit.PartySharingDialogProps.md#createurl)
- [invitations](dxos_react_toolkit.PartySharingDialogProps.md#invitations)
- [modal](dxos_react_toolkit.PartySharingDialogProps.md#modal)
- [onClose](dxos_react_toolkit.PartySharingDialogProps.md#onclose)
- [onCreateOfflineInvitation](dxos_react_toolkit.PartySharingDialogProps.md#oncreateofflineinvitation)
- [open](dxos_react_toolkit.PartySharingDialogProps.md#open)
- [partyKey](dxos_react_toolkit.PartySharingDialogProps.md#partykey)

## Properties

### createUrl

• `Optional` **createUrl**: (`invitationCode`: `string`) => `string`

#### Type declaration

▸ (`invitationCode`): `string`

##### Parameters

| Name | Type |
| :------ | :------ |
| `invitationCode` | `string` |

##### Returns

`string`

#### Inherited from

Omit.createUrl

#### Defined in

[packages/sdk/react-toolkit/src/containers/SharingDialog/SharingDialog.tsx:48](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-toolkit/src/containers/SharingDialog/SharingDialog.tsx#L48)

___

### invitations

• `Optional` **invitations**: `InvitationRequest`[]

#### Inherited from

Omit.invitations

#### Defined in

[packages/sdk/react-toolkit/src/containers/SharingDialog/SharingDialog.tsx:42](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-toolkit/src/containers/SharingDialog/SharingDialog.tsx#L42)

___

### modal

• `Optional` **modal**: `boolean`

#### Inherited from

Omit.modal

#### Defined in

[packages/sdk/react-toolkit/src/containers/SharingDialog/SharingDialog.tsx:39](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-toolkit/src/containers/SharingDialog/SharingDialog.tsx#L39)

___

### onClose

• `Optional` **onClose**: () => `void`

#### Type declaration

▸ (): `void`

##### Returns

`void`

#### Inherited from

Omit.onClose

#### Defined in

[packages/sdk/react-toolkit/src/containers/SharingDialog/SharingDialog.tsx:47](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-toolkit/src/containers/SharingDialog/SharingDialog.tsx#L47)

___

### onCreateOfflineInvitation

• `Optional` **onCreateOfflineInvitation**: () => `void`

#### Type declaration

▸ (): `void`

##### Returns

`void`

#### Inherited from

Omit.onCreateOfflineInvitation

#### Defined in

[packages/sdk/react-toolkit/src/containers/SharingDialog/SharingDialog.tsx:45](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-toolkit/src/containers/SharingDialog/SharingDialog.tsx#L45)

___

### open

• **open**: `boolean`

#### Inherited from

Omit.open

#### Defined in

[packages/sdk/react-toolkit/src/containers/SharingDialog/SharingDialog.tsx:38](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-toolkit/src/containers/SharingDialog/SharingDialog.tsx#L38)

___

### partyKey

• **partyKey**: `PublicKey`

#### Defined in

[packages/sdk/react-toolkit/src/containers/SharingDialog/PartySharingDialog.tsx:15](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-toolkit/src/containers/SharingDialog/PartySharingDialog.tsx#L15)
