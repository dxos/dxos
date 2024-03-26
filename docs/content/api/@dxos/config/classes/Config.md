# Class `Config`
<sub>Declared in [sdk/config/src/config.ts:122](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/config/src/config.ts#L122)</sub>


Global configuration object.
NOTE: Config objects are immutable.

## Constructors
### [constructor(config, objects)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/config/src/config.ts#L129)


Creates an immutable instance.

Returns: <code>[Config](/api/@dxos/config/classes/Config)</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/config/interfaces/Config)</code>

`objects`: <code>[Config](/api/@dxos/config/interfaces/Config)[]</code>



## Properties
### [values](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/config/src/config.ts#L136)
Type: <code>[Config](/api/@dxos/config/interfaces/Config)</code>

Returns an immutable config JSON object.


## Methods
### [find(path, test)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/config/src/config.ts#L157)


Get unique key.

Returns: <code>undefined | T</code>

Arguments: 

`path`: <code>string</code>

`test`: <code>object</code>


### [get(key, \[defaultValue\])](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/config/src/config.ts#L147)


Returns the given config property.

Returns: <code>[DeepIndex](/api/@dxos/config/types/DeepIndex)&lt;[Config](/api/@dxos/config/interfaces/Config), [ParseKey](/api/@dxos/config/types/ParseKey)&lt;K&gt;&gt;</code>

Arguments: 

`key`: <code>K</code>

`defaultValue`: <code>[DeepIndex](/api/@dxos/config/types/DeepIndex)&lt;[Config](/api/@dxos/config/interfaces/Config), [ParseKey](/api/@dxos/config/types/ParseKey)&lt;K&gt;&gt;</code>


### [getOrThrow(key)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/config/src/config.ts#L180)


Returns the given config property or throw if it doesn't exist.

Returns: <code>Exclude&lt;[DeepIndex](/api/@dxos/config/types/DeepIndex)&lt;[Config](/api/@dxos/config/interfaces/Config), [ParseKey](/api/@dxos/config/types/ParseKey)&lt;K&gt;&gt;, undefined&gt;</code>

Arguments: 

`key`: <code>K</code>


### [getUnchecked(key, \[defaultValue\])](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/config/src/config.ts#L171)


Returns config key without type checking.

Returns: <code>T</code>

Arguments: 

`key`: <code>string</code>

`defaultValue`: <code>T</code>


