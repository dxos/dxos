# Type alias: Callable<T, R\>

[@dxos/echo-db](../modules/dxos_echo_db.md).Callable

 **Callable**<`T`, `R`\>: (`entities`: `T`[], `result`: `R`) => `R`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`Entity`](../classes/dxos_echo_db.Entity.md) |
| `R` | `R` |

#### Type declaration

(`entities`, `result`): `R`

Visitor callback.
The visitor is passed the current entities and result (accumulator),
which may be modified and returned.

##### Parameters

| Name | Type |
| :------ | :------ |
| `entities` | `T`[] |
| `result` | `R` |

##### Returns

`R`

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/queries.ts:38](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/packlets/database/selection/queries.ts#L38)
