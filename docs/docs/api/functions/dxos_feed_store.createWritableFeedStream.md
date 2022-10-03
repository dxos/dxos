# Function: createWritableFeedStream

[@dxos/feed-store](../modules/dxos_feed_store.md).createWritableFeedStream

**createWritableFeedStream**(`feed`): `Writable`

Returns a stream that appends messages directly to a hypercore feed.

#### Parameters

| Name | Type |
| :------ | :------ |
| `feed` | [`HypercoreFeed`](../interfaces/dxos_feed_store.HypercoreFeed.md) |

#### Returns

`Writable`

#### Defined in

[packages/echo/feed-store/src/stream.ts:23](https://github.com/dxos/dxos/blob/main/packages/echo/feed-store/src/stream.ts#L23)
