# Class `Config`
Declared in [`packages/sdk/config/src/config.ts:92`](https://github.com/dxos/protocols/blob/main/packages/sdk/config/src/config.ts#L92)


Global configuration object.
NOTE: Config objects are immutable.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/config/src/config.ts#L100)


Creates an immutable instance.

Returns: [`Config`](/api/@dxos/config/classes/Config)

Arguments: 

`objects`: `[`[`Config`](/api/@dxos/config/interfaces/Config)`, ...`[`Config`](/api/@dxos/config/interfaces/Config)`[]]`

## Properties
### [`values`](https://github.com/dxos/protocols/blob/main/packages/sdk/config/src/config.ts#L107)
Type: [`Config`](/api/@dxos/config/interfaces/Config)

Returns an immutable config JSON object.

## Methods
### [`get`](https://github.com/dxos/protocols/blob/main/packages/sdk/config/src/config.ts#L118)


Returns the given config property.

Returns: [`DeepIndex`](/api/@dxos/config/types/DeepIndex)`<`[`Config`](/api/@dxos/config/interfaces/Config)`, `[`ParseKey`](/api/@dxos/config/types/ParseKey)`<K>, undefined>`

Arguments: 

`key`: `K`

`defaultValue`: [`DeepIndex`](/api/@dxos/config/types/DeepIndex)`<`[`Config`](/api/@dxos/config/interfaces/Config)`, `[`ParseKey`](/api/@dxos/config/types/ParseKey)`<K>, undefined>`
### [`getOrThrow`](https://github.com/dxos/protocols/blob/main/packages/sdk/config/src/config.ts#L136)


Returns the given config property or throw if it doesn't exist.

Returns: `Exclude<`[`DeepIndex`](/api/@dxos/config/types/DeepIndex)`<`[`Config`](/api/@dxos/config/interfaces/Config)`, `[`ParseKey`](/api/@dxos/config/types/ParseKey)`<K>, undefined>, undefined>`

Arguments: 

`key`: `K`
### [`getUnchecked`](https://github.com/dxos/protocols/blob/main/packages/sdk/config/src/config.ts#L127)


Returns config key without type checking.

Returns: `T`

Arguments: 

`key`: `string`

`defaultValue`: `T`