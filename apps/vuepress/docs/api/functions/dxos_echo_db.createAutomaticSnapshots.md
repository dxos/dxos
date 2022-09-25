# Function: createAutomaticSnapshots

[@dxos/echo-db](../modules/dxos_echo_db.md).createAutomaticSnapshots

**createAutomaticSnapshots**(`party`, `clock`, `store`, `interval`): () => `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `party` | [`PartyPipeline`](../classes/dxos_echo_db.PartyPipeline.md) |
| `clock` | [`TimeframeClock`](../classes/dxos_echo_db.TimeframeClock.md) |
| `store` | [`SnapshotStore`](../classes/dxos_echo_db.SnapshotStore.md) |
| `interval` | `number` |

#### Returns

`fn`

(): `void`

Register an event listener.

If provided callback was already registered as once-listener, it is made permanent.

##### Returns

`void`

function that unsubscribes this event listener

#### Defined in

[packages/echo/echo-db/src/snapshots/snapshot-generator.ts:15](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/echo-db/src/snapshots/snapshot-generator.ts#L15)
