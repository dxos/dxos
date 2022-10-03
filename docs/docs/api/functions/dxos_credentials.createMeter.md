# Function: createMeter

[@dxos/credentials](../modules/dxos_credentials.md).createMeter

**createMeter**(`metrics`): (`target`: `any`, `propertyName`: `string`, `descriptor`: `TypedPropertyDescriptor`<(...`args`: `any`) => `any`\>) => `void`

A decorator for collecting metrics on methods.

#### Parameters

| Name | Type |
| :------ | :------ |
| `metrics` | [`SimpleMetrics`](../classes/dxos_credentials.SimpleMetrics.md) |

#### Returns

`fn`

(`target`, `propertyName`, `descriptor`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `target` | `any` |
| `propertyName` | `string` |
| `descriptor` | `TypedPropertyDescriptor`<(...`args`: `any`) => `any`\> |

##### Returns

`void`

#### Defined in

[packages/halo/credentials/src/keys/simple-metrics.ts:51](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/keys/simple-metrics.ts#L51)
