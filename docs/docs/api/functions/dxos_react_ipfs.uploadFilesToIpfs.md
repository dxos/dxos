# Function: uploadFilesToIpfs

[@dxos/react-ipfs](../modules/dxos_react_ipfs.md).uploadFilesToIpfs

**uploadFilesToIpfs**(`ipfsClient`, `files`, `onError?`): `Promise`<(`undefined` \| { `cid`: `string` = path; `filename`: `string` = file.name; `size`: `number`  })[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `ipfsClient` | `IPFSHTTPClient` |
| `files` | `File`[] |
| `onError?` | (`error`: `Error`) => `void` |

#### Returns

`Promise`<(`undefined` \| { `cid`: `string` = path; `filename`: `string` = file.name; `size`: `number`  })[]\>

#### Defined in

[packages/sdk/react-ipfs/src/hooks/useIpfsFiles.ts:37](https://github.com/dxos/dxos/blob/main/packages/sdk/react-ipfs/src/hooks/useIpfsFiles.ts#L37)
