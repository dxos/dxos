# Function: createWritable

[@dxos/feed-store](../modules/dxos_feed_store.md).createWritable

**createWritable**<`T`\>(`callback`): `WritableStream`

Creates a writeStream object stream.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | (`message`: `T`) => `Promise`<`void`\> |

#### Returns

`WritableStream`

#### Defined in

[packages/echo/feed-store/src/stream.ts:42](https://github.com/dxos/dxos/blob/main/packages/echo/feed-store/src/stream.ts#L42)
