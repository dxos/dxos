# Class `Config`
<sub>Declared in [packages/sdk/config/dist/types/src/config.d.ts:37]()</sub>


Global configuration object.
NOTE: Config objects are immutable.

## Constructors
### [constructor(\[config\], objects)]()


Creates an immutable instance.

Returns: <code>[Config](/api/@dxos/react-client/classes/Config)</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/config/interfaces/Config)</code>

`objects`: <code>[Config](/api/@dxos/config/interfaces/Config)[]</code>



## Properties
### [values]()
Type: <code>[Config](/api/@dxos/config/interfaces/Config)</code>

Returns an immutable config JSON object.


## Methods
### [find(path, test)]()


Get unique key.

Returns: <code>undefined | T</code>

Arguments: 

`path`: <code>string</code>

`test`: <code>object</code>


### [get(key, \[defaultValue\])]()


Returns the given config property.

Returns: <code>undefined | [DeepIndex](/api/@dxos/config/types/DeepIndex)&lt;[Config](/api/@dxos/config/interfaces/Config), [ParseKey](/api/@dxos/config/types/ParseKey)&lt;K&gt;&gt;</code>

Arguments: 

`key`: <code>K</code>

`defaultValue`: <code>[DeepIndex](/api/@dxos/config/types/DeepIndex)&lt;[Config](/api/@dxos/config/interfaces/Config), [ParseKey](/api/@dxos/config/types/ParseKey)&lt;K&gt;&gt;</code>


### [getOrThrow(key)]()


Returns the given config property or throw if it doesn't exist.

Returns: <code>Exclude&lt;[DeepIndex](/api/@dxos/config/types/DeepIndex)&lt;[Config](/api/@dxos/config/interfaces/Config), [ParseKey](/api/@dxos/config/types/ParseKey)&lt;K&gt;&gt;, undefined&gt;</code>

Arguments: 

`key`: <code>K</code>


