# Module: @dxos/react-toolkit

## Table of contents

### Enumerations

- [RegistrationStage](../enums/dxos_react_toolkit.RegistrationStage.md)

### Classes

- [ErrorBoundary](../classes/dxos_react_toolkit.ErrorBoundary.md)
- [IpfsHelper](../classes/dxos_react_toolkit.IpfsHelper.md)
- [RegistrySearchModel](../classes/dxos_react_toolkit.RegistrySearchModel.md)

### Interfaces

- [ErrorContextState](../interfaces/dxos_react_toolkit.ErrorContextState.md)
- [ErrorIndicatorProps](../interfaces/dxos_react_toolkit.ErrorIndicatorProps.md)
- [ErrorViewProps](../interfaces/dxos_react_toolkit.ErrorViewProps.md)
- [JoinDialogProps](../interfaces/dxos_react_toolkit.JoinDialogProps.md)
- [JoinHaloDialogProps](../interfaces/dxos_react_toolkit.JoinHaloDialogProps.md)
- [JoinPartyDialogProps](../interfaces/dxos_react_toolkit.JoinPartyDialogProps.md)
- [MemberRowProps](../interfaces/dxos_react_toolkit.MemberRowProps.md)
- [PartySharingDialogProps](../interfaces/dxos_react_toolkit.PartySharingDialogProps.md)
- [PendingInvitationProps](../interfaces/dxos_react_toolkit.PendingInvitationProps.md)
- [ProfileDialogProps](../interfaces/dxos_react_toolkit.ProfileDialogProps.md)
- [RegistrationDialogProps](../interfaces/dxos_react_toolkit.RegistrationDialogProps.md)
- [RegistrySearchPanelProps](../interfaces/dxos_react_toolkit.RegistrySearchPanelProps.md)
- [RegistryTypeFilterProps](../interfaces/dxos_react_toolkit.RegistryTypeFilterProps.md)
- [SharingDialogProps](../interfaces/dxos_react_toolkit.SharingDialogProps.md)

### Type Aliases

- [HaloSharingDialogProps](dxos_react_toolkit.md#halosharingdialogprops)
- [SearchFilter](dxos_react_toolkit.md#searchfilter)

### Variables

- [ErrorContext](dxos_react_toolkit.md#errorcontext)
- [isMobile](dxos_react_toolkit.md#ismobile)

### Functions

- [ErrorIndicator](dxos_react_toolkit.md#errorindicator)
- [ErrorView](dxos_react_toolkit.md#errorview)
- [ExportDialog](dxos_react_toolkit.md#exportdialog)
- [GlobalErrorWrapper](dxos_react_toolkit.md#globalerrorwrapper)
- [HaloSharingDialog](dxos_react_toolkit.md#halosharingdialog)
- [ImportDialog](dxos_react_toolkit.md#importdialog)
- [JoinDialog](dxos_react_toolkit.md#joindialog)
- [JoinHaloDialog](dxos_react_toolkit.md#joinhalodialog)
- [JoinPartyDialog](dxos_react_toolkit.md#joinpartydialog)
- [MemberRow](dxos_react_toolkit.md#memberrow)
- [PartySharingDialog](dxos_react_toolkit.md#partysharingdialog)
- [PendingInvitation](dxos_react_toolkit.md#pendinginvitation)
- [ProfileDialog](dxos_react_toolkit.md#profiledialog)
- [RegistrationDialog](dxos_react_toolkit.md#registrationdialog)
- [RegistrySearchPanel](dxos_react_toolkit.md#registrysearchpanel)
- [RegistryTypeFilter](dxos_react_toolkit.md#registrytypefilter)
- [SharingDialog](dxos_react_toolkit.md#sharingdialog)
- [SpawnBotPanel](dxos_react_toolkit.md#spawnbotpanel)
- [createDownloadLink](dxos_react_toolkit.md#createdownloadlink)
- [createResourceFilter](dxos_react_toolkit.md#createresourcefilter)
- [createTheme](dxos_react_toolkit.md#createtheme)
- [getTypeName](dxos_react_toolkit.md#gettypename)
- [handleKey](dxos_react_toolkit.md#handlekey)
- [ordinal](dxos_react_toolkit.md#ordinal)
- [pickUnique](dxos_react_toolkit.md#pickunique)
- [useErrors](dxos_react_toolkit.md#useerrors)
- [usePartySerializer](dxos_react_toolkit.md#usepartyserializer)
- [useRegistrySearchModel](dxos_react_toolkit.md#useregistrysearchmodel)

## Type Aliases

### HaloSharingDialogProps

Ƭ **HaloSharingDialogProps**: `Omit`<[`SharingDialogProps`](../interfaces/dxos_react_toolkit.SharingDialogProps.md), ``"onCreateInvitation"`` \| ``"onCancelInvitation"`` \| ``"title"`` \| ``"members"``\>

#### Defined in

[packages/sdk/react-toolkit/src/containers/SharingDialog/HaloSharingDialog.tsx:11](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/containers/SharingDialog/HaloSharingDialog.tsx#L11)

___

### SearchFilter

Ƭ **SearchFilter**: (`resource`: `ResourceSet`) => `boolean`

#### Type declaration

▸ (`resource`): `boolean`

##### Parameters

| Name | Type |
| :------ | :------ |
| `resource` | `ResourceSet` |

##### Returns

`boolean`

#### Defined in

[packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistrySearchModel.ts:11](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistrySearchModel.ts#L11)

## Variables

### ErrorContext

• `Const` **ErrorContext**: `Context`<[`ErrorContextState`](../interfaces/dxos_react_toolkit.ErrorContextState.md) \| `undefined`\>

#### Defined in

[packages/sdk/react-toolkit/src/hooks/useErrors.ts:15](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/hooks/useErrors.ts#L15)

___

### isMobile

• `Const` **isMobile**: ``null`` \| `string`

#### Defined in

[packages/sdk/react-toolkit/src/helpers/util.ts:8](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/helpers/util.ts#L8)

## Functions

### ErrorIndicator

▸ **ErrorIndicator**(`__namedParameters`): ``null`` \| `Element`

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`ErrorIndicatorProps`](../interfaces/dxos_react_toolkit.ErrorIndicatorProps.md) |

#### Returns

``null`` \| `Element`

#### Defined in

[packages/sdk/react-toolkit/src/components/ErrorIndicator.tsx:19](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/components/ErrorIndicator.tsx#L19)

___

### ErrorView

▸ **ErrorView**(`__namedParameters`): ``null`` \| `Element`

View component used to handle crashed app situations.
Allows the user to either restart the app or reset storage.
Used in `ErrorBoundary`

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`ErrorViewProps`](../interfaces/dxos_react_toolkit.ErrorViewProps.md) |

#### Returns

``null`` \| `Element`

#### Defined in

[packages/sdk/react-toolkit/src/components/ErrorView.tsx:54](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/components/ErrorView.tsx#L54)

___

### ExportDialog

▸ **ExportDialog**(`__namedParameters`): `Element`

Dialog to export keyring to file.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.encrypter` | (`passphrase`: `string`) => `Promise`<`string`\> |
| `__namedParameters.filename` | `string` |
| `__namedParameters.onClose` | () => `void` |
| `__namedParameters.open` | `boolean` |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-toolkit/src/components/ExportDialog.tsx:14](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/components/ExportDialog.tsx#L14)

___

### GlobalErrorWrapper

▸ **GlobalErrorWrapper**(`__namedParameters`): `Element`

Wrapper for global error handling.
https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.children` | `ReactNode` |
| `__namedParameters.indicator?` | ``null`` \| `FunctionComponent`<[`ErrorIndicatorProps`](../interfaces/dxos_react_toolkit.ErrorIndicatorProps.md)\> |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-toolkit/src/containers/ErrorBoundary/GlobalErrorWrapper.tsx:20](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/containers/ErrorBoundary/GlobalErrorWrapper.tsx#L20)

___

### HaloSharingDialog

▸ **HaloSharingDialog**(`props`): `Element`

Manages the workflow for inviting a new device to a HALO party.

#### Parameters

| Name | Type |
| :------ | :------ |
| `props` | [`HaloSharingDialogProps`](dxos_react_toolkit.md#halosharingdialogprops) |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-toolkit/src/containers/SharingDialog/HaloSharingDialog.tsx:16](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/containers/SharingDialog/HaloSharingDialog.tsx#L16)

___

### ImportDialog

▸ **ImportDialog**(`__namedParameters`): `Element`

Dialog to import keyring from file.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.decrypter` | (`text`: `string`, `passphrase`: `string`) => `Promise`<`string`\> |
| `__namedParameters.onClose` | (`text?`: `string`) => `void` |
| `__namedParameters.open` | `boolean` |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-toolkit/src/components/ImportDialog.tsx:15](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/components/ImportDialog.tsx#L15)

___

### JoinDialog

▸ **JoinDialog**(`__namedParameters`): `Element`

Manages joining HALO and parties.
Not exported for the end user.
See JoinPartyDialog and JoinHaloDialog.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`JoinDialogProps`](../interfaces/dxos_react_toolkit.JoinDialogProps.md) |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-toolkit/src/containers/JoinDialog/JoinDialog.tsx:44](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/containers/JoinDialog/JoinDialog.tsx#L44)

___

### JoinHaloDialog

▸ **JoinHaloDialog**(`__namedParameters`): `Element`

Manages the workflow of joining a HALO invitation.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`JoinHaloDialogProps`](../interfaces/dxos_react_toolkit.JoinHaloDialogProps.md) |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-toolkit/src/containers/JoinDialog/JoinHaloDialog.tsx:18](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/containers/JoinDialog/JoinHaloDialog.tsx#L18)

___

### JoinPartyDialog

▸ **JoinPartyDialog**(`__namedParameters`): `Element`

Manages the workflow of joining a Party invitation.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`JoinPartyDialogProps`](../interfaces/dxos_react_toolkit.JoinPartyDialogProps.md) |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-toolkit/src/containers/JoinDialog/JoinPartyDialog.tsx:19](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/containers/JoinDialog/JoinPartyDialog.tsx#L19)

___

### MemberRow

▸ **MemberRow**(`__namedParameters`): `Element`

Party member row.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`MemberRowProps`](../interfaces/dxos_react_toolkit.MemberRowProps.md) |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-toolkit/src/containers/SharingDialog/MemberRow.tsx:21](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/containers/SharingDialog/MemberRow.tsx#L21)

___

### PartySharingDialog

▸ **PartySharingDialog**(`__namedParameters`): ``null`` \| `Element`

Manages the workflow for inviting a user to a party.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`PartySharingDialogProps`](../interfaces/dxos_react_toolkit.PartySharingDialogProps.md) |

#### Returns

``null`` \| `Element`

#### Defined in

[packages/sdk/react-toolkit/src/containers/SharingDialog/PartySharingDialog.tsx:21](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/containers/SharingDialog/PartySharingDialog.tsx#L21)

___

### PendingInvitation

▸ **PendingInvitation**(`__namedParameters`): `Element`

Displays the pending invitation row, invitaion/cancel buttons, etc.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`PendingInvitationProps`](../interfaces/dxos_react_toolkit.PendingInvitationProps.md) |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-toolkit/src/containers/SharingDialog/PendingInvitation.tsx:27](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/containers/SharingDialog/PendingInvitation.tsx#L27)

___

### ProfileDialog

▸ **ProfileDialog**(`__namedParameters`): `Element`

**`Deprecated`**

Replace with RegistrationDialog.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`ProfileDialogProps`](../interfaces/dxos_react_toolkit.ProfileDialogProps.md) |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-toolkit/src/components/ProfileDialog.tsx:23](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/components/ProfileDialog.tsx#L23)

___

### RegistrationDialog

▸ **RegistrationDialog**(`__namedParameters`): `Element`

Registration and recovery dialog.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`RegistrationDialogProps`](../interfaces/dxos_react_toolkit.RegistrationDialogProps.md) |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-toolkit/src/components/RegistrationDialog.tsx:63](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/components/RegistrationDialog.tsx#L63)

___

### RegistrySearchPanel

▸ **RegistrySearchPanel**(`__namedParameters`): `Element`

Registry search with optional filters.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`RegistrySearchPanelProps`](../interfaces/dxos_react_toolkit.RegistrySearchPanelProps.md) |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistrySearchPanel.tsx:26](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistrySearchPanel.tsx#L26)

___

### RegistryTypeFilter

▸ **RegistryTypeFilter**(`__namedParameters`): `Element`

List of selectable types.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`RegistryTypeFilterProps`](../interfaces/dxos_react_toolkit.RegistryTypeFilterProps.md) |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistryTypeFilter.tsx:37](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistryTypeFilter.tsx#L37)

___

### SharingDialog

▸ **SharingDialog**(`__namedParameters`): `Element`

Reusable sharing logic for inviting to a regular party and to a HALO party.
Not exported for the end user.
See PartySharingDialog and DeviceSharingDialog.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`SharingDialogProps`](../interfaces/dxos_react_toolkit.SharingDialogProps.md) |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-toolkit/src/containers/SharingDialog/SharingDialog.tsx:56](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/containers/SharingDialog/SharingDialog.tsx#L56)

___

### SpawnBotPanel

▸ **SpawnBotPanel**(`__namedParameters`): `Element`

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `SpawnBotDialogProps` |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-toolkit/src/containers/SharingDialog/SpawnBotPanel.tsx:17](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/containers/SharingDialog/SpawnBotPanel.tsx#L17)

___

### createDownloadLink

▸ **createDownloadLink**(`filename`, `text`): `HTMLAnchorElement`

#### Parameters

| Name | Type |
| :------ | :------ |
| `filename` | `string` |
| `text` | `string` |

#### Returns

`HTMLAnchorElement`

#### Defined in

[packages/sdk/react-toolkit/src/helpers/util.ts:28](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/helpers/util.ts#L28)

___

### createResourceFilter

▸ **createResourceFilter**(`domainExp`, `resourceExp`): (`resource`: `ResourceSet`) => ``null`` \| `RegExpExecArray`

#### Parameters

| Name | Type |
| :------ | :------ |
| `domainExp` | `RegExp` |
| `resourceExp` | `RegExp` |

#### Returns

`fn`

▸ (`resource`): ``null`` \| `RegExpExecArray`

##### Parameters

| Name | Type |
| :------ | :------ |
| `resource` | `ResourceSet` |

##### Returns

``null`` \| `RegExpExecArray`

#### Defined in

[packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistrySearchModel.ts:33](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistrySearchModel.ts#L33)

___

### createTheme

▸ **createTheme**(`base`): `Theme`

#### Parameters

| Name | Type |
| :------ | :------ |
| `base` | `ThemeOptions` |

#### Returns

`Theme`

#### Defined in

[packages/sdk/react-toolkit/src/components/Theme.tsx:39](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/components/Theme.tsx#L39)

___

### getTypeName

▸ **getTypeName**(`__namedParameters`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `RegistryType` |

#### Returns

`string`

#### Defined in

[packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistrySearchModel.ts:23](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistrySearchModel.ts#L23)

___

### handleKey

▸ **handleKey**(`key`, `callback`): (`event`: { `key`: `string`  }) => `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `callback` | () => `void` |

#### Returns

`fn`

▸ (`event`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `Object` |
| `event.key` | `string` |

##### Returns

`void`

#### Defined in

[packages/sdk/react-toolkit/src/helpers/events.ts:6](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/helpers/events.ts#L6)

___

### ordinal

▸ **ordinal**(`n`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `n` | `number` |

#### Returns

`string`

#### Defined in

[packages/sdk/react-toolkit/src/helpers/util.ts:25](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/helpers/util.ts#L25)

___

### pickUnique

▸ **pickUnique**<`T`\>(`array`, `n`): `T`[]

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `array` | `T`[] |
| `n` | `number` |

#### Returns

`T`[]

#### Defined in

[packages/sdk/react-toolkit/src/helpers/util.ts:11](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/helpers/util.ts#L11)

___

### useErrors

▸ **useErrors**(): [`Error`[], () => `void`]

#### Returns

[`Error`[], () => `void`]

#### Defined in

[packages/sdk/react-toolkit/src/hooks/useErrors.ts:18](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/hooks/useErrors.ts#L18)

___

### usePartySerializer

▸ **usePartySerializer**(): `PartySerializer`

#### Returns

`PartySerializer`

#### Defined in

[packages/sdk/react-toolkit/src/hooks/usePartySerializer.ts:10](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/hooks/usePartySerializer.ts#L10)

___

### useRegistrySearchModel

▸ **useRegistrySearchModel**(`registry`, `filters?`, `deps?`): [`RegistrySearchModel`](../classes/dxos_react_toolkit.RegistrySearchModel.md)

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `registry` | `RegistryClient` | `undefined` |
| `filters` | [`SearchFilter`](dxos_react_toolkit.md#searchfilter)[] | `[]` |
| `deps` | `any`[] | `[]` |

#### Returns

[`RegistrySearchModel`](../classes/dxos_react_toolkit.RegistrySearchModel.md)

#### Defined in

[packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistrySearchModel.ts:14](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistrySearchModel.ts#L14)
