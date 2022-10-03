# Class: NetworkGenerator

[@dxos/network-generator](../modules/dxos_network_generator.md).NetworkGenerator

## Hierarchy

- `Record`<[`Topology`](../types/dxos_network_generator.Topology.md), `Generator`\>

  ↳ **`NetworkGenerator`**

## Constructors

### constructor

**new NetworkGenerator**(`options?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`NetworkOptions`](../interfaces/dxos_network_generator.NetworkOptions.md) |

#### Inherited from

Record<Topology, Generator\>.constructor

#### Defined in

[packages/mesh/network-generator/src/network-generator.ts:35](https://github.com/dxos/dxos/blob/main/packages/mesh/network-generator/src/network-generator.ts#L35)

## Properties

### balancedBinTree

 **balancedBinTree**: `Generator`

#### Inherited from

Record.balancedBinTree

___

### circularLadder

 **circularLadder**: `Generator`

#### Inherited from

Record.circularLadder

___

### cliqueCircle

 **cliqueCircle**: `Generator`

#### Inherited from

Record.cliqueCircle

___

### complete

 **complete**: `Generator`

#### Inherited from

Record.complete

___

### completeBipartite

 **completeBipartite**: `Generator`

#### Inherited from

Record.completeBipartite

___

### error

 `Readonly` **error**: `Event`<`Error`\>

#### Defined in

[packages/mesh/network-generator/src/network-generator.ts:32](https://github.com/dxos/dxos/blob/main/packages/mesh/network-generator/src/network-generator.ts#L32)

___

### generator

 `Private` `Readonly` **generator**: `any`

#### Defined in

[packages/mesh/network-generator/src/network-generator.ts:33](https://github.com/dxos/dxos/blob/main/packages/mesh/network-generator/src/network-generator.ts#L33)

___

### grid

 **grid**: `Generator`

#### Inherited from

Record.grid

___

### grid3

 **grid3**: `Generator`

#### Inherited from

Record.grid3

___

### ladder

 **ladder**: `Generator`

#### Inherited from

Record.ladder

___

### noLinks

 **noLinks**: `Generator`

#### Inherited from

Record.noLinks

___

### path

 **path**: `Generator`

#### Inherited from

Record.path

___

### wattsStrogatz

 **wattsStrogatz**: `Generator`

#### Inherited from

Record.wattsStrogatz

## Methods

### createTopology

**createTopology**(`topology`, ...`args`): `Promise`<[`Network`](dxos_network_generator.Network.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `topology` | ``"ladder"`` \| ``"complete"`` \| ``"completeBipartite"`` \| ``"balancedBinTree"`` \| ``"path"`` \| ``"circularLadder"`` \| ``"grid"`` \| ``"grid3"`` \| ``"noLinks"`` \| ``"cliqueCircle"`` \| ``"wattsStrogatz"`` |
| `...args` | `any` |

#### Returns

`Promise`<[`Network`](dxos_network_generator.Network.md)\>

#### Defined in

[packages/mesh/network-generator/src/network-generator.ts:62](https://github.com/dxos/dxos/blob/main/packages/mesh/network-generator/src/network-generator.ts#L62)
