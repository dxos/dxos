# Class: IpfsHelper

[@dxos/react-toolkit](../modules/dxos_react_toolkit.md).IpfsHelper

IPFS gateway HTTP methods.
Imported from wirelineio/appkit

## Constructors

### constructor

**new IpfsHelper**(`ipfsGateway`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `ipfsGateway` | `any` |

#### Defined in

[packages/sdk/react-toolkit/src/helpers/ipfs-helper.ts:14](https://github.com/dxos/dxos/blob/main/packages/sdk/react-toolkit/src/helpers/ipfs-helper.ts#L14)

## Properties

### \_ipfsGateway

 **\_ipfsGateway**: `string`

#### Defined in

[packages/sdk/react-toolkit/src/helpers/ipfs-helper.ts:12](https://github.com/dxos/dxos/blob/main/packages/sdk/react-toolkit/src/helpers/ipfs-helper.ts#L12)

## Methods

### \_fetch

**_fetch**(`request`, `cid?`): `Promise`<{}\>

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `request` | `any` | `undefined` |
| `cid` | `string` | `''` |

#### Returns

`Promise`<{}\>

#### Defined in

[packages/sdk/react-toolkit/src/helpers/ipfs-helper.ts:52](https://github.com/dxos/dxos/blob/main/packages/sdk/react-toolkit/src/helpers/ipfs-helper.ts#L52)

___

### download

**download**(`cid`): `Promise`<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `cid` | `string` |

#### Returns

`Promise`<`string`\>

#### Defined in

[packages/sdk/react-toolkit/src/helpers/ipfs-helper.ts:38](https://github.com/dxos/dxos/blob/main/packages/sdk/react-toolkit/src/helpers/ipfs-helper.ts#L38)

___

### upload

**upload**(`body`, `contentType?`): `Promise`<`string`\>

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `body` | `any` | `undefined` |
| `contentType` | `string` | `'text/plain'` |

#### Returns

`Promise`<`string`\>

#### Defined in

[packages/sdk/react-toolkit/src/helpers/ipfs-helper.ts:23](https://github.com/dxos/dxos/blob/main/packages/sdk/react-toolkit/src/helpers/ipfs-helper.ts#L23)

___

### url

**url**(`cid`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `cid` | `string` |

#### Returns

`string`

#### Defined in

[packages/sdk/react-toolkit/src/helpers/ipfs-helper.ts:19](https://github.com/dxos/dxos/blob/main/packages/sdk/react-toolkit/src/helpers/ipfs-helper.ts#L19)
