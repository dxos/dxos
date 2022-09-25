# Function: mapFeedWriter

[@dxos/echo-protocol](../modules/dxos_echo_protocol.md).mapFeedWriter

**mapFeedWriter**<`T`, `U`\>(`map`, `writer`): [`FeedWriter`](../interfaces/dxos_echo_protocol.FeedWriter.md)<`T`\>

#### Type parameters

| Name |
| :------ |
| `T` |
| `U` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `map` | (`arg`: `T`) => `MaybePromise`<`U`\> |
| `writer` | [`FeedWriter`](../interfaces/dxos_echo_protocol.FeedWriter.md)<`U`\> |

#### Returns

[`FeedWriter`](../interfaces/dxos_echo_protocol.FeedWriter.md)<`T`\>

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-writer.ts:23](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/echo-protocol/src/feeds/feed-writer.ts#L23)
