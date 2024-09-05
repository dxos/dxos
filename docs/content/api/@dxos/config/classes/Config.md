# Class `Config`
<sub>Declared in [sdk/config/src/config.ts:125](https://github.com/dxos/dxos/blob/a81c792ef/packages/sdk/config/src/config.ts#L125)</sub>


Global configuration object.
NOTE: Config objects are immutable.

## Constructors
### [constructor(config, objects)](https://github.com/dxos/dxos/blob/a81c792ef/packages/sdk/config/src/config.ts#L132)


Creates an immutable instance.

Returns: <code>[Config](/api/@dxos/config/classes/Config)</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/config/interfaces/Config)</code>

`objects`: <code>[Config](/api/@dxos/config/interfaces/Config)[]</code>



## Properties
### [values](https://github.com/dxos/dxos/blob/a81c792ef/packages/sdk/config/src/config.ts#L139)
Type: <code>[Config](/api/@dxos/config/interfaces/Config)</code>

Returns an immutable config JSON object.


## Methods
### [find(path, test)](https://github.com/dxos/dxos/blob/a81c792ef/packages/sdk/config/src/config.ts#L160)


Get unique key.

Returns: <code>undefined | T</code>

Arguments: 

`path`: <code>string</code>

`test`: <code>object</code>


### [get(key, \[defaultValue\])](https://github.com/dxos/dxos/blob/a81c792ef/packages/sdk/config/src/config.ts#L150)


Returns the given config property.

Returns: <code>undefined | [DeepIndex](/api/@dxos/config/types/DeepIndex)&lt;[Config](/api/@dxos/config/interfaces/Config), [ParseKey](/api/@dxos/config/types/ParseKey)&lt;K&gt;&gt;</code>

Arguments: 

`key`: <code>K</code>

`defaultValue`: <code>[DeepIndex](/api/@dxos/config/types/DeepIndex)&lt;[Config](/api/@dxos/config/interfaces/Config), [ParseKey](/api/@dxos/config/types/ParseKey)&lt;K&gt;&gt;</code>


### [getOrThrow(key)](https://github.com/dxos/dxos/blob/a81c792ef/packages/sdk/config/src/config.ts#L174)


Returns the given config property or throw if it doesn't exist.

Returns: <code>Exclude&lt;[DeepIndex](/api/@dxos/config/types/DeepIndex)&lt;[Config](/api/@dxos/config/interfaces/Config), [ParseKey](/api/@dxos/config/types/ParseKey)&lt;K&gt;&gt;, undefined&gt;</code>

Arguments: 

`key`: <code>K</code>


