# Class `Config`
> Declared in [`packages/sdk/config/src/config.ts:92`](https://github.com/dxos/protocols/blob/main/packages/sdk/config/src/config.ts#L92)


Global configuration object.
NOTE: Config objects are immutable.

## Constructors
```ts
new Config (...objects: [Config, ...Config[]]) => Config
```
Creates an immutable instance.

## Properties
### `values:  get Config`
Returns an immutable config JSON object.

## Functions
```ts
get <K> (key: K, defaultValue: DeepIndex<Config, ParseKey<K>, undefined>) => DeepIndex<Config, ParseKey<K>, undefined>
```
Returns the given config property.
```ts
getOrThrow <K> (key: K) => Exclude<DeepIndex<Config, ParseKey<K>, undefined>, undefined>
```
Returns the given config property or throw if it doesn't exist.
```ts
getUnchecked <T> (key: string, defaultValue: T) => T
```
Returns config key without type checking.