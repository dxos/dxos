---
id: "dxos_echo_db.SnapshotStore"
title: "Class: SnapshotStore"
sidebar_label: "SnapshotStore"
custom_edit_url: null
---

[@dxos/echo-db](../modules/dxos_echo_db.md).SnapshotStore

Stores party snapshots. Takes any `random-access-storage` compatible backend.

Passing `ram` as a backend will make all of files temporary, effectively disabling snapshots.

## Constructors

### constructor

• **new SnapshotStore**(`_directory`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_directory` | `Directory` |

#### Defined in

[packages/echo/echo-db/src/snapshots/snapshot-store.ts:20](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/snapshots/snapshot-store.ts#L20)

## Methods

### clear

▸ **clear**(): `Promise`<`void`\>

Removes all data.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/snapshots/snapshot-store.ts:61](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/snapshots/snapshot-store.ts#L61)

___

### load

▸ **load**(`partyKey`): `Promise`<`undefined` \| `PartySnapshot`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `partyKey` | `PublicKey` |

#### Returns

`Promise`<`undefined` \| `PartySnapshot`\>

#### Defined in

[packages/echo/echo-db/src/snapshots/snapshot-store.ts:24](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/snapshots/snapshot-store.ts#L24)

___

### save

▸ **save**(`snapshot`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `snapshot` | `PartySnapshot` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/snapshots/snapshot-store.ts:46](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/snapshots/snapshot-store.ts#L46)
