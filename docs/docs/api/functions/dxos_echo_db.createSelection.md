# Function: createSelection

[@dxos/echo-db](../modules/dxos_echo_db.md).createSelection

**createSelection**<`R`\>(`itemsProvider`, `updateEventProvider`, `root`, `filter`, `value`): [`Selection`](../classes/dxos_echo_db.Selection.md)<[`Item`](../classes/dxos_echo_db.Item.md)<`any`\>, `R`\>

Factory for selector that provides a root set of items.

#### Type parameters

| Name |
| :------ |
| `R` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `itemsProvider` | () => [`Item`](../classes/dxos_echo_db.Item.md)<`Model`<`any`, `any`\>\>[] |  |
| `updateEventProvider` | () => `Event`<[`Entity`](../classes/dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>\>[]\> |  |
| `root` | [`SelectionRoot`](../types/dxos_echo_db.SelectionRoot.md) |  |
| `filter` | `undefined` \| [`RootFilter`](../types/dxos_echo_db.RootFilter.md) |  |
| `value` | `R` | Initial reducer value. |

#### Returns

[`Selection`](../classes/dxos_echo_db.Selection.md)<[`Item`](../classes/dxos_echo_db.Item.md)<`any`\>, `R`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/selection.ts:31](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/packlets/database/selection/selection.ts#L31)
