# Class `Config`
<sub>Declared in [packages/sdk/config/src/config.ts:122](https://github.com/dxos/dxos/blob/main/packages/sdk/config/src/config.ts#L122)</sub>


Global configuration object.
NOTE: Config objects are immutable.

## Constructors
### [constructor(config, objects)](https://github.com/dxos/dxos/blob/main/packages/sdk/config/src/config.ts#L130)


Creates an immutable instance.

Returns: <code>[Config](/api/@dxos/config/classes/Config)</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/config/interfaces/Config)</code>

`objects`: <code>[Config](/api/@dxos/config/interfaces/Config)[]</code>

## Properties
### [values](https://github.com/dxos/dxos/blob/main/packages/sdk/config/src/config.ts#L137)
Type: <code>[Config](/api/@dxos/config/interfaces/Config)</code>

Returns an immutable config JSON object.

## Methods
### [get(key, \[defaultValue\])](https://github.com/dxos/dxos/blob/main/packages/sdk/config/src/config.ts#L148)


Returns the given config property.

Returns: <code>[DeepIndex](/api/@dxos/config/types/DeepIndex)&lt;[Config](/api/@dxos/config/interfaces/Config), [ParseKey](/api/@dxos/config/types/ParseKey)&lt;K&gt;, undefined&gt;</code>

Arguments: 

`key`: <code>K</code>

`defaultValue`: <code>[DeepIndex](/api/@dxos/config/types/DeepIndex)&lt;[Config](/api/@dxos/config/interfaces/Config), [ParseKey](/api/@dxos/config/types/ParseKey)&lt;K&gt;, undefined&gt;</code>
### [getOrThrow(key)](https://github.com/dxos/dxos/blob/main/packages/sdk/config/src/config.ts#L169)


Returns the given config property or throw if it doesn't exist.

Returns: <code>Exclude&lt;[DeepIndex](/api/@dxos/config/types/DeepIndex)&lt;[Config](/api/@dxos/config/interfaces/Config), [ParseKey](/api/@dxos/config/types/ParseKey)&lt;K&gt;, undefined&gt;, undefined&gt;</code>

Arguments: 

`key`: <code>K</code>
### [getUnchecked(key, \[defaultValue\])](https://github.com/dxos/dxos/blob/main/packages/sdk/config/src/config.ts#L160)


Returns config key without type checking.

Returns: <code>T</code>

Arguments: 

`key`: <code>string</code>

`defaultValue`: <code>T</code>