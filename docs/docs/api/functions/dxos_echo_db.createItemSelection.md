# Function: createItemSelection

[@dxos/echo-db](../modules/dxos_echo_db.md).createItemSelection

**createItemSelection**<`R`\>(`root`, `update`, `value`): [`Selection`](../classes/dxos_echo_db.Selection.md)<[`Item`](../classes/dxos_echo_db.Item.md)<`any`\>, `R`\>

Factory for specific item selector.

#### Type parameters

| Name |
| :------ |
| `R` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `root` | [`Item`](../classes/dxos_echo_db.Item.md)<`any`\> |  |
| `update` | `Event`<[`Entity`](../classes/dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>\>[]\> |  |
| `value` | `R` | Initial reducer value. |

#### Returns

[`Selection`](../classes/dxos_echo_db.Selection.md)<[`Item`](../classes/dxos_echo_db.Item.md)<`any`\>, `R`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/selection/selection.ts:60](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/selection/selection.ts#L60)
