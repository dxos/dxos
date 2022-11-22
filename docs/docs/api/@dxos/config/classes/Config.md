# Class `Config`
<sub>Declared in [packages/sdk/config/src/config.ts:100](https://github.com/dxos/protocols/blob/main/packages/sdk/config/src/config.ts#L100)</sub>


Global configuration object.
NOTE: Config objects are immutable.

## Constructors
### [constructor(config, objects)](https://github.com/dxos/protocols/blob/main/packages/sdk/config/src/config.ts#L108)


Creates an immutable instance.

Returns: <code>[Config](/api/@dxos/config/classes/Config)</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/config/interfaces/Config)</code>

`objects`: <code>[Config](/api/@dxos/config/interfaces/Config)[]</code>

## Properties
### [values](https://github.com/dxos/protocols/blob/main/packages/sdk/config/src/config.ts#L115)
Type: <code>[Config](/api/@dxos/config/interfaces/Config)</code>

Returns an immutable config JSON object.

## Methods
### [get(key, \[defaultValue\])](https://github.com/dxos/protocols/blob/main/packages/sdk/config/src/config.ts#L126)


Returns the given config property.

Returns: <code>[DeepIndex](/api/@dxos/config/types/DeepIndex)&lt;[Config](/api/@dxos/config/interfaces/Config), [ParseKey](/api/@dxos/config/types/ParseKey)&lt;K&gt;, undefined&gt;</code>

Arguments: 

`key`: <code>K</code>

`defaultValue`: <code>[DeepIndex](/api/@dxos/config/types/DeepIndex)&lt;[Config](/api/@dxos/config/interfaces/Config), [ParseKey](/api/@dxos/config/types/ParseKey)&lt;K&gt;, undefined&gt;</code>
### [getOrThrow(key)](https://github.com/dxos/protocols/blob/main/packages/sdk/config/src/config.ts#L147)


Returns the given config property or throw if it doesn't exist.

Returns: <code>Exclude&lt;[DeepIndex](/api/@dxos/config/types/DeepIndex)&lt;[Config](/api/@dxos/config/interfaces/Config), [ParseKey](/api/@dxos/config/types/ParseKey)&lt;K&gt;, undefined&gt;, undefined&gt;</code>

Arguments: 

`key`: <code>K</code>
### [getUnchecked(key, \[defaultValue\])](https://github.com/dxos/protocols/blob/main/packages/sdk/config/src/config.ts#L138)


Returns config key without type checking.

Returns: <code>T</code>

Arguments: 

`key`: <code>string</code>

`defaultValue`: <code>T</code>