# Class `Config`
> Declared in [`packages/sdk/config/src/config.ts:92`](https://github.com/dxos/protocols/blob/main/packages/sdk/config/src/config.ts#L92)


Global configuration object.
NOTE: Config objects are immutable.

## Constructors
### constructor
```ts
(...objects: [Config, ...Config[]]) => Config
```
Creates an immutable instance.

## Properties
### values
> Type: `Config`
<br/>

Returns an immutable config JSON object.

## Methods
### get
```ts
<K> (key: K, defaultValue: DeepIndex<Config, ParseKey<K>, undefined>) => DeepIndex<Config, ParseKey<K>, undefined>
```
Returns the given config property.
### getOrThrow
```ts
<K> (key: K) => Exclude<DeepIndex<Config, ParseKey<K>, undefined>, undefined>
```
Returns the given config property or throw if it doesn't exist.
### getUnchecked
```ts
<T> (key: string, defaultValue: T) => T
```
Returns config key without type checking.