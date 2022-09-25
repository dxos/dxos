# Function: createTransform

[@dxos/feed-store](../modules/dxos_feed_store.md).createTransform

**createTransform**<`R`, `W`\>(`callback`): `Transform`

Creates a transform object stream.

#### Type parameters

| Name |
| :------ |
| `R` |
| `W` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | (`message`: `R`) => `Promise`<`undefined` \| `W`\> |

#### Returns

`Transform`

#### Defined in

[packages/echo/feed-store/src/stream.ts:59](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/feed-store/src/stream.ts#L59)
