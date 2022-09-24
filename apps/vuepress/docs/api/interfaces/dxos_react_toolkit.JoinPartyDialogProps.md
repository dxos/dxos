# Interface: JoinPartyDialogProps

[@dxos/react-toolkit](../modules/dxos_react_toolkit.md).JoinPartyDialogProps

## Hierarchy

- `Omit`<[`JoinDialogProps`](dxos_react_toolkit.JoinDialogProps.md), ``"onJoin"`` \| ``"title"``\>

  ↳ **`JoinPartyDialogProps`**

## Table of contents

### Properties

- [closeOnSuccess](dxos_react_toolkit.JoinPartyDialogProps.md#closeonsuccess)
- [invitationCode](dxos_react_toolkit.JoinPartyDialogProps.md#invitationcode)
- [modal](dxos_react_toolkit.JoinPartyDialogProps.md#modal)
- [onClose](dxos_react_toolkit.JoinPartyDialogProps.md#onclose)
- [onJoin](dxos_react_toolkit.JoinPartyDialogProps.md#onjoin)
- [open](dxos_react_toolkit.JoinPartyDialogProps.md#open)

## Properties

### closeOnSuccess

• `Optional` **closeOnSuccess**: `boolean`

#### Inherited from

Omit.closeOnSuccess

#### Defined in

[packages/sdk/react-toolkit/src/containers/JoinDialog/JoinDialog.tsx:35](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/containers/JoinDialog/JoinDialog.tsx#L35)

___

### invitationCode

• `Optional` **invitationCode**: `string`

#### Inherited from

Omit.invitationCode

#### Defined in

[packages/sdk/react-toolkit/src/containers/JoinDialog/JoinDialog.tsx:32](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/containers/JoinDialog/JoinDialog.tsx#L32)

___

### modal

• `Optional` **modal**: `boolean`

#### Inherited from

Omit.modal

#### Defined in

[packages/sdk/react-toolkit/src/containers/JoinDialog/JoinDialog.tsx:36](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/containers/JoinDialog/JoinDialog.tsx#L36)

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

[packages/sdk/react-toolkit/src/containers/JoinDialog/JoinDialog.tsx:34](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/containers/JoinDialog/JoinDialog.tsx#L34)

___

### onJoin

• `Optional` **onJoin**: (`party`: `Party`) => `void` \| `Promise`<`void`\>

#### Type declaration

▸ (`party`): `void` \| `Promise`<`void`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `party` | `Party` |

##### Returns

`void` \| `Promise`<`void`\>

#### Defined in

[packages/sdk/react-toolkit/src/containers/JoinDialog/JoinPartyDialog.tsx:13](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/containers/JoinDialog/JoinPartyDialog.tsx#L13)

___

### open

• **open**: `boolean`

#### Inherited from

Omit.open

#### Defined in

[packages/sdk/react-toolkit/src/containers/JoinDialog/JoinDialog.tsx:30](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/containers/JoinDialog/JoinDialog.tsx#L30)
