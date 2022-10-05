# Type alias: SpaceParams

[@dxos/echo-db](../modules/dxos_echo_db.md).SpaceParams

 **SpaceParams**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `controlFeed` | `FeedDescriptor` |
| `dataFeed` | `FeedDescriptor` |
| `feedProvider` | (`feedKey`: `PublicKey`) => `Promise`<`FeedDescriptor`\> |
| `genesis_feed` | `FeedDescriptor` |
| `initialTimeframe` | `Timeframe` |
| `networkManager` | `NetworkManager` |
| `networkPlugins` | `Plugin`[] |
| `space_key` | `PublicKey` |
| `swarmIdentity` | [`SwarmIdentity`](../interfaces/dxos_echo_db.SwarmIdentity.md) |

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space.ts:26](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space.ts#L26)
