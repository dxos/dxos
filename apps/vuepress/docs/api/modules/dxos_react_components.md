# Module: @dxos/react-components

## Table of contents

### Classes

- [TextSearchModel](../classes/dxos_react_components.TextSearchModel.md)

### Interfaces

- [AppBarProps](../interfaces/dxos_react_components.AppBarProps.md)
- [CopyTextProps](../interfaces/dxos_react_components.CopyTextProps.md)
- [CustomTextFieldProps](../interfaces/dxos_react_components.CustomTextFieldProps.md)
- [DataCellProps](../interfaces/dxos_react_components.DataCellProps.md)
- [DialogProps](../interfaces/dxos_react_components.DialogProps.md)
- [GetRowHeightProps](../interfaces/dxos_react_components.GetRowHeightProps.md)
- [JsonTreeViewProps](../interfaces/dxos_react_components.JsonTreeViewProps.md)
- [OpenButtonProps](../interfaces/dxos_react_components.OpenButtonProps.md)
- [PasscodeProps](../interfaces/dxos_react_components.PasscodeProps.md)
- [SearchAutocompleteProps](../interfaces/dxos_react_components.SearchAutocompleteProps.md)
- [SearchBarProps](../interfaces/dxos_react_components.SearchBarProps.md)
- [SearchModel](../interfaces/dxos_react_components.SearchModel.md)
- [SkeletonProps](../interfaces/dxos_react_components.SkeletonProps.md)
- [VirtualTableProps](../interfaces/dxos_react_components.VirtualTableProps.md)

### Type Aliases

- [Filter](dxos_react_components.md#filter)
- [RowData](dxos_react_components.md#rowdata)
- [SearchResult](dxos_react_components.md#searchresult)
- [SelectionModel](dxos_react_components.md#selectionmodel)

### Variables

- [BoxContainer](dxos_react_components.md#boxcontainer)
- [PATH](dxos_react_components.md#path)

### Functions

- [CloseButton](dxos_react_components.md#closebutton)
- [CopyText](dxos_react_components.md#copytext)
- [CopyToClipboard](dxos_react_components.md#copytoclipboard)
- [CustomTextField](dxos_react_components.md#customtextfield)
- [DXOS](dxos_react_components.md#dxos)
- [DefaultTableCell](dxos_react_components.md#defaulttablecell)
- [Dialog](dxos_react_components.md#dialog)
- [FileUploadDialog](dxos_react_components.md#fileuploaddialog)
- [FullScreen](dxos_react_components.md#fullscreen)
- [HashIcon](dxos_react_components.md#hashicon)
- [JsonTreeView](dxos_react_components.md#jsontreeview)
- [MemberAvatar](dxos_react_components.md#memberavatar)
- [MemberList](dxos_react_components.md#memberlist)
- [ModalDialog](dxos_react_components.md#modaldialog)
- [NonModalDialog](dxos_react_components.md#nonmodaldialog)
- [OpenButton](dxos_react_components.md#openbutton)
- [Passcode](dxos_react_components.md#passcode)
- [QRCode](dxos_react_components.md#qrcode)
- [SearchAutocomplete](dxos_react_components.md#searchautocomplete)
- [Searchbar](dxos_react_components.md#searchbar)
- [ShareButton](dxos_react_components.md#sharebutton)
- [Skeleton](dxos_react_components.md#skeleton)
- [SlidingAppBar](dxos_react_components.md#slidingappbar)
- [SlidingContent](dxos_react_components.md#slidingcontent)
- [SlidingDrawer](dxos_react_components.md#slidingdrawer)
- [Toolbar](dxos_react_components.md#toolbar)
- [VirtualTable](dxos_react_components.md#virtualtable)
- [useFileDownload](dxos_react_components.md#usefiledownload)

## Type Aliases

### Filter

Ƭ **Filter**<`T`\>: (`value`: `T`) => `boolean`

#### Type parameters

| Name |
| :------ |
| `T` |

#### Type declaration

▸ (`value`): `boolean`

##### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `T` |

##### Returns

`boolean`

#### Defined in

[packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts:13](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts#L13)

___

### RowData

Ƭ **RowData**: `Object`

#### Index signature

▪ [index: `string`]: `any`

#### Defined in

[packages/sdk/react-components/src/VirtualTable.tsx:25](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/VirtualTable.tsx#L25)

___

### SearchResult

Ƭ **SearchResult**<`T`\>: `Object`

Search result.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Type declaration

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `text` | `string` |
| `type?` | `string` |
| `value` | `T` |

#### Defined in

[packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts:11](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts#L11)

___

### SelectionModel

Ƭ **SelectionModel**: `string`[]

#### Defined in

[packages/sdk/react-components/src/VirtualTable.tsx:287](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/VirtualTable.tsx#L287)

## Variables

### BoxContainer

• `Const` **BoxContainer**: `any`

Expandable container that support scrolling.
https://css-tricks.com/snippets/css/a-guide-to-flexbox
NOTE: Scrolling flexboxes requires that ancestors set overflow to hidden, which is set by default.

Example:
```
<FullScreen>
  <BoxContainer>
    <div>Fixed</div>
     <BoxContainer scrollX>
       <List />
     </BoxContainer>
  <BoxContainer>
</Fullscreen>
```

#### Defined in

[packages/sdk/react-components/src/BoxContainer.tsx:32](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/BoxContainer.tsx#L32)

___

### PATH

• `Const` **PATH**: ``"M252.498,3.661L250.207,0L127.996,76.278L5.793,0L3.493,3.661L0.035,6.2L88.7,128L0,249.8L3.458,252.339L5.758,256L127.996,179.722L250.207,256L252.498,252.339L256,249.8L167.3,128L256,6.2L252.498,3.661ZM132.319,94.653L156.614,128L132.319,161.347L132.319,94.653ZM123.673,161.347L99.386,128L123.673,94.653L123.673,161.347ZM94.051,120.661L20.093,19.108L121.779,82.582L94.051,120.661ZM121.788,173.418L20.093,236.892L94.051,135.339L121.788,173.418ZM161.966,135.339L235.915,236.892L134.221,173.418L161.966,135.339ZM134.229,82.582L235.915,19.108L161.957,120.661L134.229,82.582Z"``

#### Defined in

[packages/sdk/react-components/src/Icons/DXOS.tsx:9](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/Icons/DXOS.tsx#L9)

## Functions

### CloseButton

▸ **CloseButton**(`__namedParameters`): `Element`

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `CloseButtonProps` |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-components/src/SlidingDrawer.tsx:134](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/SlidingDrawer.tsx#L134)

___

### CopyText

▸ **CopyText**(`__namedParameters`): ``null`` \| `Element`

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`CopyTextProps`](../interfaces/dxos_react_components.CopyTextProps.md) |

#### Returns

``null`` \| `Element`

#### Defined in

[packages/sdk/react-components/src/Clipboard/CopyText.tsx:20](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/Clipboard/CopyText.tsx#L20)

___

### CopyToClipboard

▸ **CopyToClipboard**(`__namedParameters`): `Element`

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.icon?` | `OverridableComponent`<`SvgIconTypeMap`<`unknown`, ``"svg"``\>\> |
| `__namedParameters.onCopy?` | (`text`: `string`) => `void` |
| `__namedParameters.text` | `string` |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-components/src/Clipboard/CopyToClipboard.tsx:12](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/Clipboard/CopyToClipboard.tsx#L12)

___

### CustomTextField

▸ **CustomTextField**(`__namedParameters`): `Element`

Click-to-edit text field.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`CustomTextFieldProps`](../interfaces/dxos_react_components.CustomTextFieldProps.md) |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-components/src/CustomTextField.tsx:31](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/CustomTextField.tsx#L31)

___

### DXOS

▸ **DXOS**(`props`): `Element`

Logo
NOTE: In Affinity Designer resize (transform) then export with additional properties (flatten transforms).

#### Parameters

| Name | Type |
| :------ | :------ |
| `props` | `any` |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-components/src/Icons/DXOS.tsx:15](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/Icons/DXOS.tsx#L15)

___

### DefaultTableCell

▸ **DefaultTableCell**(`__namedParameters`): `Element`

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.children` | `ReactNode` |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-components/src/VirtualTable.tsx:112](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/VirtualTable.tsx#L112)

___

### Dialog

▸ **Dialog**(`__namedParameters`): `Element`

A standard dialog component that implements a non-modal implementation for testing.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`DialogProps`](../interfaces/dxos_react_components.DialogProps.md) |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-components/src/Dialog.tsx:139](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/Dialog.tsx#L139)

___

### FileUploadDialog

▸ **FileUploadDialog**(`props`, `context?`): ``null`` \| `ReactElement`<`any`, `any`\>

Standard file upload dialog.

#### Parameters

| Name | Type |
| :------ | :------ |
| `props` | `PropsWithChildren`<{ `accept?`: `string` ; `multiple?`: ``false`` ; `onClose`: () => `void` ; `onUpload`: (`files`: `File`[]) => `void` ; `open?`: `boolean`  }\> |
| `context?` | `any` |

#### Returns

``null`` \| `ReactElement`<`any`, `any`\>

#### Defined in

node_modules/.pnpm/@types+react@17.0.50/node_modules/@types/react/index.d.ts:543

___

### FullScreen

▸ **FullScreen**(`props`, `context?`): ``null`` \| `ReactElement`<`any`, `any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `props` | `any` |
| `context?` | `any` |

#### Returns

``null`` \| `ReactElement`<`any`, `any`\>

#### Defined in

node_modules/.pnpm/@types+react@17.0.50/node_modules/@types/react/index.d.ts:543

___

### HashIcon

▸ **HashIcon**(`__namedParameters`): `Element`

A stable generic icon based on a hash.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.size?` | `Size` |
| `__namedParameters.sx?` | `any` |
| `__namedParameters.value` | `string` |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-components/src/HashIcon.tsx:88](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/HashIcon.tsx#L88)

___

### JsonTreeView

▸ **JsonTreeView**(`__namedParameters`): `Element`

Visualizes an object as a tree view of all properties.
Works with JSON and other objects with nested values.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`JsonTreeViewProps`](../interfaces/dxos_react_components.JsonTreeViewProps.md) |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-components/src/JsonTree/JsonTreeView.tsx:142](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/JsonTree/JsonTreeView.tsx#L142)

___

### MemberAvatar

▸ **MemberAvatar**(`__namedParameters`): `ReactElement`<`any`, `string` \| `JSXElementConstructor`<`any`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.member?` | `PartyMember` |

#### Returns

`ReactElement`<`any`, `string` \| `JSXElementConstructor`<`any`\>\>

#### Defined in

[packages/sdk/react-components/src/MemberList/MemberAvatar.tsx:62](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/MemberList/MemberAvatar.tsx#L62)

___

### MemberList

▸ **MemberList**(`__namedParameters`): `Element`

List of member avatars.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.members` | `PartyMember`[] |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-components/src/MemberList/MemberList.tsx:16](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/MemberList/MemberList.tsx#L16)

___

### ModalDialog

▸ **ModalDialog**(`__namedParameters`): `Element`

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`DialogProps`](../interfaces/dxos_react_components.DialogProps.md) |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-components/src/Dialog.tsx:43](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/Dialog.tsx#L43)

___

### NonModalDialog

▸ **NonModalDialog**(`__namedParameters`): ``null`` \| `Element`

Test dialog enables testing of the dialog without the modal container.
For example, this enables the testing of multiple dialogs in parallel from different client context.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`DialogProps`](../interfaces/dxos_react_components.DialogProps.md) |

#### Returns

``null`` \| `Element`

#### Defined in

[packages/sdk/react-components/src/Dialog.tsx:98](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/Dialog.tsx#L98)

___

### OpenButton

▸ **OpenButton**(`__namedParameters`): `Element`

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`OpenButtonProps`](../interfaces/dxos_react_components.OpenButtonProps.md) |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-components/src/SlidingDrawer.tsx:155](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/SlidingDrawer.tsx#L155)

___

### Passcode

▸ **Passcode**(`__namedParameters`): `Element`

Displays a multi-digit passcode, which may optionally be editable.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`PasscodeProps`](../interfaces/dxos_react_components.PasscodeProps.md) |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-components/src/Passcode.tsx:90](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/Passcode.tsx#L90)

___

### QRCode

▸ **QRCode**(`__namedParameters`): `Element`

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.value` | `string` |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-components/src/QRCode.tsx:8](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/QRCode.tsx#L8)

___

### SearchAutocomplete

▸ **SearchAutocomplete**(`__namedParameters`): `Element`

Registry search with optional filters.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`SearchAutocompleteProps`](../interfaces/dxos_react_components.SearchAutocompleteProps.md)<`any`\> |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-components/src/SearchAutocomplete/SearchAutocomplete.tsx:21](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/SearchAutocomplete/SearchAutocomplete.tsx#L21)

___

### Searchbar

▸ **Searchbar**(`__namedParameters`): `Element`

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`SearchBarProps`](../interfaces/dxos_react_components.SearchBarProps.md) |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-components/src/Searchbar.tsx:16](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/Searchbar.tsx#L16)

___

### ShareButton

▸ **ShareButton**(`__namedParameters`): `Element`

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.onClick` | () => `void` |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-components/src/MemberList/MemberAvatar.tsx:43](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/MemberList/MemberAvatar.tsx#L43)

___

### Skeleton

▸ **Skeleton**(`__namedParameters`): `Element`

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`SkeletonProps`](../interfaces/dxos_react_components.SkeletonProps.md) |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-components/src/Skeleton/Skeleton.tsx:15](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/Skeleton/Skeleton.tsx#L15)

___

### SlidingAppBar

▸ **SlidingAppBar**(`props`, `context?`): ``null`` \| `ReactElement`<`any`, `any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `props` | `PropsWithChildren`<[`AppBarProps`](../interfaces/dxos_react_components.AppBarProps.md)\> |
| `context?` | `any` |

#### Returns

``null`` \| `ReactElement`<`any`, `any`\>

#### Defined in

node_modules/.pnpm/@types+react@17.0.50/node_modules/@types/react/index.d.ts:543

___

### SlidingContent

▸ **SlidingContent**(`props`, `context?`): ``null`` \| `ReactElement`<`any`, `any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `props` | `PropsWithChildren`<`PropsWithChildren`<`ContentProps`\>\> |
| `context?` | `any` |

#### Returns

``null`` \| `ReactElement`<`any`, `any`\>

#### Defined in

node_modules/.pnpm/@types+react@17.0.50/node_modules/@types/react/index.d.ts:543

___

### SlidingDrawer

▸ **SlidingDrawer**(`props`, `context?`): ``null`` \| `ReactElement`<`any`, `any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `props` | `PropsWithChildren`<`SlidingDrawerProps`\> |
| `context?` | `any` |

#### Returns

``null`` \| `ReactElement`<`any`, `any`\>

#### Defined in

node_modules/.pnpm/@types+react@17.0.50/node_modules/@types/react/index.d.ts:543

___

### Toolbar

▸ **Toolbar**(`props`, `context?`): ``null`` \| `ReactElement`<`any`, `any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `props` | `PropsWithChildren`<`ToolbarProps`<``"div"``, {}\>\> |
| `context?` | `any` |

#### Returns

``null`` \| `ReactElement`<`any`, `any`\>

#### Defined in

node_modules/.pnpm/@types+react@17.0.50/node_modules/@types/react/index.d.ts:543

___

### VirtualTable

▸ **VirtualTable**<`T`\>(`__namedParameters`): `Element`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`RowData`](dxos_react_components.md#rowdata) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`VirtualTableProps`](../interfaces/dxos_react_components.VirtualTableProps.md)<`T`\> |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-components/src/VirtualTable.tsx:313](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/VirtualTable.tsx#L313)

___

### useFileDownload

▸ **useFileDownload**(): (`data`: `Blob`, `filename`: `string`) => `void`

File download anchor.

const download = useDownload();
const handleDownload = (data: Blob) => {
  download(data, 'test.txt');
};

#### Returns

`fn`

▸ (`data`, `filename`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `Blob` |
| `filename` | `string` |

##### Returns

`void`

#### Defined in

[packages/sdk/react-components/src/Files/useFileDownload.ts:15](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/Files/useFileDownload.ts#L15)
