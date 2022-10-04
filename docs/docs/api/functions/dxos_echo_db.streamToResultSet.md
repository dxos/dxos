# Function: streamToResultSet

[@dxos/echo-db](../modules/dxos_echo_db.md).streamToResultSet

**streamToResultSet**<`T`, `U`\>(`stream`, `map`): [`ResultSet`](../classes/dxos_echo_db.ResultSet.md)<`U`\>

#### Type parameters

| Name |
| :------ |
| `T` |
| `U` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | `Stream`<`T`\> |
| `map` | (`arg?`: `T`) => `U`[] |

#### Returns

[`ResultSet`](../classes/dxos_echo_db.ResultSet.md)<`U`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/api/subscription.ts:15](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/api/subscription.ts#L15)
