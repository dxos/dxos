# Class: DXN

[@dxos/registry-client](../modules/dxos_registry_client.md).DXN

Decentralized Name.
Example: dxn://example:foo/bar

## Table of contents

### Constructors

- [constructor](dxos_registry_client.DXN.md#constructor)

### Properties

- [authority](dxos_registry_client.DXN.md#authority)
- [path](dxos_registry_client.DXN.md#path)
- [tag](dxos_registry_client.DXN.md#tag)

### Methods

- [toString](dxos_registry_client.DXN.md#tostring)
- [with](dxos_registry_client.DXN.md#with)
- [fromDomainKey](dxos_registry_client.DXN.md#fromdomainkey)
- [fromDomainName](dxos_registry_client.DXN.md#fromdomainname)
- [normalize](dxos_registry_client.DXN.md#normalize)
- [parse](dxos_registry_client.DXN.md#parse)
- [urldecode](dxos_registry_client.DXN.md#urldecode)
- [urlencode](dxos_registry_client.DXN.md#urlencode)
- [validateDomainName](dxos_registry_client.DXN.md#validatedomainname)
- [validatePath](dxos_registry_client.DXN.md#validatepath)
- [validateTag](dxos_registry_client.DXN.md#validatetag)

## Constructors

### constructor

• `Private` **new DXN**(`authority`, `path`, `tag?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `authority` | `string` \| [`DomainKey`](dxos_registry_client.DomainKey.md) |
| `path` | `string` |
| `tag?` | `string` |

#### Defined in

[packages/sdk/registry-client/src/api/dxn.ts:57](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/dxn.ts#L57)

## Properties

### authority

• `Readonly` **authority**: `string` \| [`DomainKey`](dxos_registry_client.DomainKey.md)

#### Defined in

[packages/sdk/registry-client/src/api/dxn.ts:58](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/dxn.ts#L58)

___

### path

• `Readonly` **path**: `string`

#### Defined in

[packages/sdk/registry-client/src/api/dxn.ts:59](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/dxn.ts#L59)

___

### tag

• `Optional` `Readonly` **tag**: `string`

#### Defined in

[packages/sdk/registry-client/src/api/dxn.ts:60](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/dxn.ts#L60)

## Methods

### toString

▸ **toString**(): `string`

#### Returns

`string`

#### Defined in

[packages/sdk/registry-client/src/api/dxn.ts:78](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/dxn.ts#L78)

___

### with

▸ **with**(`__namedParameters`): [`DXN`](dxos_registry_client.DXN.md)

Create new DXN overriding specified fields.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.authority?` | `string` \| [`DomainKey`](dxos_registry_client.DomainKey.md) |
| `__namedParameters.path?` | `string` |
| `__namedParameters.tag?` | ``null`` \| `string` |

#### Returns

[`DXN`](dxos_registry_client.DXN.md)

#### Defined in

[packages/sdk/registry-client/src/api/dxn.ts:66](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/dxn.ts#L66)

___

### fromDomainKey

▸ `Static` **fromDomainKey**(`domainKey`, `path`, `tag?`): [`DXN`](dxos_registry_client.DXN.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `domainKey` | [`DomainKey`](dxos_registry_client.DomainKey.md) |
| `path` | `string` |
| `tag?` | `string` |

#### Returns

[`DXN`](dxos_registry_client.DXN.md)

#### Defined in

[packages/sdk/registry-client/src/api/dxn.ts:32](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/dxn.ts#L32)

___

### fromDomainName

▸ `Static` **fromDomainName**(`domainName`, `path`, `tag?`): [`DXN`](dxos_registry_client.DXN.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `domainName` | `string` |
| `path` | `string` |
| `tag?` | `string` |

#### Returns

[`DXN`](dxos_registry_client.DXN.md)

#### Defined in

[packages/sdk/registry-client/src/api/dxn.ts:38](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/dxn.ts#L38)

___

### normalize

▸ `Static` `Private` **normalize**(`part`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `part` | `string` |

#### Returns

`string`

#### Defined in

[packages/sdk/registry-client/src/api/dxn.ts:88](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/dxn.ts#L88)

___

### parse

▸ `Static` **parse**(`name`): [`DXN`](dxos_registry_client.DXN.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |

#### Returns

[`DXN`](dxos_registry_client.DXN.md)

#### Defined in

[packages/sdk/registry-client/src/api/dxn.ts:14](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/dxn.ts#L14)

___

### urldecode

▸ `Static` **urldecode**(`encodedDxn`): [`DXN`](dxos_registry_client.DXN.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `encodedDxn` | `string` |

#### Returns

[`DXN`](dxos_registry_client.DXN.md)

#### Defined in

[packages/sdk/registry-client/src/api/dxn.ts:51](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/dxn.ts#L51)

___

### urlencode

▸ `Static` **urlencode**(`dxn`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `dxn` | [`DXN`](dxos_registry_client.DXN.md) |

#### Returns

`string`

#### Defined in

[packages/sdk/registry-client/src/api/dxn.ts:45](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/dxn.ts#L45)

___

### validateDomainName

▸ `Static` `Private` **validateDomainName**(`domain`): `string`

Lower-case.
Starts with a letter.
Min 3 and max 32 characters.
Must not have multiple hyphens in a row or end with a hyphen.

#### Parameters

| Name | Type |
| :------ | :------ |
| `domain` | `string` |

#### Returns

`string`

#### Defined in

[packages/sdk/registry-client/src/api/dxn.ts:99](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/dxn.ts#L99)

___

### validatePath

▸ `Static` `Private` **validatePath**(`path`): `string`

Validates DXN path.
Change to lower-case.
Starts with a letter.
Min 3 and max 64 characters.
Must not have multiple periods in a row or end with a period or hyphen.

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |

#### Returns

`string`

#### Defined in

[packages/sdk/registry-client/src/api/dxn.ts:123](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/dxn.ts#L123)

___

### validateTag

▸ `Static` `Private` **validateTag**(`tag`): `string`

Validates DXN tag.

#### Parameters

| Name | Type |
| :------ | :------ |
| `tag` | `string` |

#### Returns

`string`

#### Defined in

[packages/sdk/registry-client/src/api/dxn.ts:142](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/dxn.ts#L142)
