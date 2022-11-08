# Type `DeepIndex`
Declared in [`packages/sdk/config/src/types.ts:50`](https://github.com/dxos/protocols/blob/main/packages/sdk/config/src/types.ts#L50)


Retrieves a property type in a series of nested objects.

Read more: https://stackoverflow.com/a/61648690.

```ts
type DeepIndex = [object Object] extends [object Object] ? [object Object] : [object Object]
```