# Module: @dxos/react-ipfs

## Table of contents

### Type Aliases

- [IPFSFile](dxos_react_ipfs.md#ipfsfile)

### Functions

- [getIpfsUrl](dxos_react_ipfs.md#getipfsurl)
- [uploadFilesToIpfs](dxos_react_ipfs.md#uploadfilestoipfs)
- [useIpfsClient](dxos_react_ipfs.md#useipfsclient)
- [useIpfsFiles](dxos_react_ipfs.md#useipfsfiles)

## Type Aliases

### IPFSFile

Ƭ **IPFSFile**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `cid` | `CID` |
| `filename?` | `string` |
| `size?` | `number` |

#### Defined in

[packages/sdk/react-ipfs/src/hooks/useIpfsFiles.ts:11](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-ipfs/src/hooks/useIpfsFiles.ts#L11)

## Functions

### getIpfsUrl

▸ **getIpfsUrl**(`gateway`, `cid`, `filename?`): `string`

Return URL to IPFS resource on local gateway.

#### Parameters

| Name | Type |
| :------ | :------ |
| `gateway` | `string` |
| `cid` | `CID` |
| `filename?` | `string` |

#### Returns

`string`

#### Defined in

[packages/sdk/react-ipfs/src/hooks/useIpfsClient.ts:15](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-ipfs/src/hooks/useIpfsClient.ts#L15)

___

### uploadFilesToIpfs

▸ **uploadFilesToIpfs**(`ipfsClient`, `files`, `onError?`): `Promise`<(`undefined` \| { `cid`: `string` = path; `filename`: `string` = file.name; `size`: `number`  })[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `ipfsClient` | `IPFSHTTPClient` |
| `files` | `File`[] |
| `onError?` | (`error`: `Error`) => `void` |

#### Returns

`Promise`<(`undefined` \| { `cid`: `string` = path; `filename`: `string` = file.name; `size`: `number`  })[]\>

#### Defined in

[packages/sdk/react-ipfs/src/hooks/useIpfsFiles.ts:37](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-ipfs/src/hooks/useIpfsFiles.ts#L37)

___

### useIpfsClient

▸ **useIpfsClient**(`url?`): `undefined` \| `IPFSHTTPClient`

https://www.npmjs.com/package/ipfs-http-client#example
NOTE: We need to run our own servers to enable CORS.
Ports
- 8001 Gateway
- 5001 API

#### Parameters

| Name | Type |
| :------ | :------ |
| `url?` | `string` |

#### Returns

`undefined` \| `IPFSHTTPClient`

#### Defined in

[packages/sdk/react-ipfs/src/hooks/useIpfsClient.ts:28](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-ipfs/src/hooks/useIpfsClient.ts#L28)

___

### useIpfsFiles

▸ **useIpfsFiles**(`party`, `type`): [`IPFSFile`](dxos_react_ipfs.md#ipfsfile)[]

Returns a list of mapped IPFS files.

#### Parameters

| Name | Type |
| :------ | :------ |
| `party` | `undefined` \| `Party` |
| `type` | `string` |

#### Returns

[`IPFSFile`](dxos_react_ipfs.md#ipfsfile)[]

#### Defined in

[packages/sdk/react-ipfs/src/hooks/useIpfsFiles.ts:22](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-ipfs/src/hooks/useIpfsFiles.ts#L22)
