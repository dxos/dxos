# Function: resultSetToStream

[@dxos/echo-db](../modules/dxos_echo_db.md).resultSetToStream

**resultSetToStream**<`T`, `U`\>(`resultSet`, `map`): `Stream`<`U`\>

#### Type parameters

| Name |
| :------ |
| `T` |
| `U` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `resultSet` | [`ResultSet`](../classes/dxos_echo_db.ResultSet.md)<`T`\> |
| `map` | (`arg`: `T`[]) => `U` |

#### Returns

`Stream`<`U`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/api/subscription.ts:10](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/api/subscription.ts#L10)
