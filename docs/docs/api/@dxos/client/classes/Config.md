# Class `Config`
<sub>Declared in [packages/sdk/config/dist/types/src/config.d.ts:36]()</sub>


Global configuration object.
NOTE: Config objects are immutable.

## Constructors
### [constructor(\[config\], objects)]()


Creates an immutable instance.

Returns: <code>[Config](/api/@dxos/client/classes/Config)</code>

Arguments: 

`config`: <code>Config</code>

`objects`: <code>Config[]</code>

## Properties
### [values]()
Type: <code>Config</code>

Returns an immutable config JSON object.

## Methods
### [get(key, \[defaultValue\])]()


Returns the given config property.

Returns: <code>DeepIndex&lt;Config, ParseKey&lt;K&gt;, undefined&gt;</code>

Arguments: 

`key`: <code>K</code>

`defaultValue`: <code>DeepIndex&lt;Config, ParseKey&lt;K&gt;, undefined&gt;</code>
### [getOrThrow(key)]()


Returns the given config property or throw if it doesn't exist.

Returns: <code>Exclude&lt;DeepIndex&lt;Config, ParseKey&lt;K&gt;, undefined&gt;, undefined&gt;</code>

Arguments: 

`key`: <code>K</code>
### [getUnchecked(key, \[defaultValue\])]()


Returns config key without type checking.

Returns: <code>T</code>

Arguments: 

`key`: <code>string</code>

`defaultValue`: <code>T</code>