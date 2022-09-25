# Function: useFileDownload

[@dxos/react-components](../modules/dxos_react_components.md).useFileDownload

**useFileDownload**(): (`data`: `Blob`, `filename`: `string`) => `void`

File download anchor.

const download = useDownload();
const handleDownload = (data: Blob) => {
  download(data, 'test.txt');
};

#### Returns

`fn`

(`data`, `filename`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `Blob` |
| `filename` | `string` |

##### Returns

`void`

#### Defined in

[packages/sdk/react-components/src/Files/useFileDownload.ts:15](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/react-components/src/Files/useFileDownload.ts#L15)
