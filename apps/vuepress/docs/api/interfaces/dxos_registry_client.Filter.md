# Interface: Filter

[@dxos/registry-client](../modules/dxos_registry_client.md).Filter

Filters to apply to lists of data from DXNS.

## Table of contents

### Properties

- [text](dxos_registry_client.Filter.md#text)
- [type](dxos_registry_client.Filter.md#type)

## Properties

### text

• `Optional` **text**: `string`

Filter by specific string appearing in record's text fields.

#### Defined in

[packages/sdk/registry-client/src/api/filtering.ts:21](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/filtering.ts#L21)

___

### type

• `Optional` **type**: [`CID`](../classes/dxos_registry_client.CID.md)

Filter by record type. Will only return data records.

#### Defined in

[packages/sdk/registry-client/src/api/filtering.ts:16](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/registry-client/src/api/filtering.ts#L16)
