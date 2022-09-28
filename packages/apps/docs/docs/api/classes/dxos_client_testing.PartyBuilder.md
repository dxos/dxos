# Class: PartyBuilder

[@dxos/client-testing](../modules/dxos_client_testing.md).PartyBuilder

Party builder.

## Constructors

### constructor

**new PartyBuilder**(`_party`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_party` | `Party` |

#### Defined in

[packages/sdk/client-testing/src/builders/partyBuilder.ts:99](https://github.com/dxos/dxos/blob/main/packages/sdk/client-testing/src/builders/partyBuilder.ts#L99)

## Accessors

### party

`get` **party**(): `Party`

#### Returns

`Party`

#### Defined in

[packages/sdk/client-testing/src/builders/partyBuilder.ts:103](https://github.com/dxos/dxos/blob/main/packages/sdk/client-testing/src/builders/partyBuilder.ts#L103)

## Methods

### createLink

**createLink**(`source`, `target`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `source` | `Item`<`ObjectModel`\> |
| `target` | `Item`<`ObjectModel`\> |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client-testing/src/builders/partyBuilder.ts:214](https://github.com/dxos/dxos/blob/main/packages/sdk/client-testing/src/builders/partyBuilder.ts#L214)

___

### createOrg

**createOrg**(): `Promise`<`Item`<`ObjectModel`\>\>

#### Returns

`Promise`<`Item`<`ObjectModel`\>\>

#### Defined in

[packages/sdk/client-testing/src/builders/partyBuilder.ts:115](https://github.com/dxos/dxos/blob/main/packages/sdk/client-testing/src/builders/partyBuilder.ts#L115)

___

### createOrgs

**createOrgs**(`n?`, `callback?`): `Promise`<`Item`<`ObjectModel`\>[]\>

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `n` | [`NumberRange`](../types/dxos_client_testing.NumberRange.md) | `1` |
| `callback?` | (`buidler`: [`OrgBuilder`](dxos_client_testing.OrgBuilder.md)) => `Promise`<`void`\> | `undefined` |

#### Returns

`Promise`<`Item`<`ObjectModel`\>[]\>

#### Defined in

[packages/sdk/client-testing/src/builders/partyBuilder.ts:107](https://github.com/dxos/dxos/blob/main/packages/sdk/client-testing/src/builders/partyBuilder.ts#L107)

___

### createParty

**createParty**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client-testing/src/builders/partyBuilder.ts:163](https://github.com/dxos/dxos/blob/main/packages/sdk/client-testing/src/builders/partyBuilder.ts#L163)

___

### createPerson

**createPerson**(`org`): `Promise`<`Item`<`ObjectModel`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `org` | `Item`<`ObjectModel`\> |

#### Returns

`Promise`<`Item`<`ObjectModel`\>\>

#### Defined in

[packages/sdk/client-testing/src/builders/partyBuilder.ts:126](https://github.com/dxos/dxos/blob/main/packages/sdk/client-testing/src/builders/partyBuilder.ts#L126)

___

### createProject

**createProject**(`org`): `Promise`<`Item`<`ObjectModel`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `org` | `Item`<`ObjectModel`\> |

#### Returns

`Promise`<`Item`<`ObjectModel`\>\>

#### Defined in

[packages/sdk/client-testing/src/builders/partyBuilder.ts:138](https://github.com/dxos/dxos/blob/main/packages/sdk/client-testing/src/builders/partyBuilder.ts#L138)

___

### createRandomItem

**createRandomItem**(`parent?`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `parent?` | `Item`<`ObjectModel`\> |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client-testing/src/builders/partyBuilder.ts:165](https://github.com/dxos/dxos/blob/main/packages/sdk/client-testing/src/builders/partyBuilder.ts#L165)

___

### createTask

**createTask**(`project`): `Promise`<`Item`<`ObjectModel`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `project` | `Item`<`ObjectModel`\> |

#### Returns

`Promise`<`Item`<`ObjectModel`\>\>

#### Defined in

[packages/sdk/client-testing/src/builders/partyBuilder.ts:150](https://github.com/dxos/dxos/blob/main/packages/sdk/client-testing/src/builders/partyBuilder.ts#L150)
