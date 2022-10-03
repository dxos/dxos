# Function: createModelTestBench

[@dxos/echo-db](../modules/dxos_echo_db.md).createModelTestBench

**createModelTestBench**<`M`\>(`options`): `Promise`<{ `items`: [`WithTestMeta`](../types/dxos_echo_db.WithTestMeta.md)<[`Item`](../classes/dxos_echo_db.Item.md)<`M`\>\>[] ; `peers`: [`ECHO`](../classes/dxos_echo_db.ECHO.md)[]  }\>

Creates a number of test ECHO instances and an item that is shared between all of them.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends `Model`<`any`, `any`, `M`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`CreateItemOption`](../interfaces/dxos_echo_db.CreateItemOption.md)<`M`\> & { `peerCount?`: `number`  } |

#### Returns

`Promise`<{ `items`: [`WithTestMeta`](../types/dxos_echo_db.WithTestMeta.md)<[`Item`](../classes/dxos_echo_db.Item.md)<`M`\>\>[] ; `peers`: [`ECHO`](../classes/dxos_echo_db.ECHO.md)[]  }\>

Item instances from each of the peers.

#### Defined in

[packages/echo/echo-db/src/testing/testing-factories.ts:56](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/testing/testing-factories.ts#L56)
