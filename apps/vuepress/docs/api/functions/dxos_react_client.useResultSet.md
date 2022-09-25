# Function: useResultSet

[@dxos/react-client](../modules/dxos_react_client.md).useResultSet

**useResultSet**<`T`\>(`resultSet`): `T`[]

A convenience hook used for subscribing to changing values of a result set.
Result sets are reactive query results from ECHO.

**`Deprecated`**

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `resultSet` | `ResultSet`<`T`\> | The result set to subscribe to |

#### Returns

`T`[]

Always up-to-date value of the result set

#### Defined in

[packages/sdk/react-client/src/hooks/util/useResultSet.ts:17](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/react-client/src/hooks/util/useResultSet.ts#L17)
