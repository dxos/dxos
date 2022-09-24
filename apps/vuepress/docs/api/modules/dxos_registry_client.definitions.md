# Namespace: definitions

[@dxos/registry-client](dxos_registry_client.md).definitions

## Table of contents

### Variables

- [registry](dxos_registry_client.definitions.md#registry)

## Variables

### registry

• **registry**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `types` | { `Account`: { `devices`: `string` = 'Vec<AccountId\>' } ; `AccountKey`: `string` = '[u8; 32]'; `Auction`: { `closed`: `string` = 'bool'; `end_block`: `string` = 'BlockNumber'; `highest_bid`: `string` = 'u128'; `highest_bidder`: `string` = 'AccountId'; `name`: `string` = 'Vec<u8\>' } ; `Domain`: { `name`: `string` = 'Option<Text\>'; `owner`: `string` = 'AccountKey' } ; `DomainKey`: `string` = '[u8; 32]'; `Multihash`: `string` = '[u8; 34]'; `Record`: { `data`: `string` = 'Vec<u8\>' } ; `Resource`: { `tags`: `string` = 'BTreeMap<Text, Multihash\>'; `versions`: `string` = 'BTreeMap<Text, Multihash\>' }  } |
| `types.Account` | { `devices`: `string` = 'Vec<AccountId\>' } |
| `types.Account.devices` | `string` |
| `types.AccountKey` | `string` |
| `types.Auction` | { `closed`: `string` = 'bool'; `end_block`: `string` = 'BlockNumber'; `highest_bid`: `string` = 'u128'; `highest_bidder`: `string` = 'AccountId'; `name`: `string` = 'Vec<u8\>' } |
| `types.Auction.closed` | `string` |
| `types.Auction.end_block` | `string` |
| `types.Auction.highest_bid` | `string` |
| `types.Auction.highest_bidder` | `string` |
| `types.Auction.name` | `string` |
| `types.Domain` | { `name`: `string` = 'Option<Text\>'; `owner`: `string` = 'AccountKey' } |
| `types.Domain.name` | `string` |
| `types.Domain.owner` | `string` |
| `types.DomainKey` | `string` |
| `types.Multihash` | `string` |
| `types.Record` | { `data`: `string` = 'Vec<u8\>' } |
| `types.Record.data` | `string` |
| `types.Resource` | { `tags`: `string` = 'BTreeMap<Text, Multihash\>'; `versions`: `string` = 'BTreeMap<Text, Multihash\>' } |
| `types.Resource.tags` | `string` |
| `types.Resource.versions` | `string` |

#### Defined in

[packages/sdk/registry-client/src/polkadot/interfaces/registry/definitions.ts:5](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/registry-client/src/polkadot/interfaces/registry/definitions.ts#L5)
