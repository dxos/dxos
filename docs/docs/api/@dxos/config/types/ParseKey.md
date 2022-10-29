# Type `ParseKey`
Declared in [`packages/sdk/config/src/types.ts:36`](https://github.com/dxos/protocols/blob/main/packages/sdk/config/src/types.ts#L36)


Parse a dot separated nested key into an array of keys.

Example: 'services.signal.server' -> ['services', 'signal', 'server'].

```ts
type ParseKey = [object Object] extends [object Object] ? [object Object] : [object Object]
```