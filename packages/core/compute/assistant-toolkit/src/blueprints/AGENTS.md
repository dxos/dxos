# Blueprint Structure

```ts
// <blueprint>/index.ts — thin re-export
export { default as XBlueprint } from './blueprint';
export { XBlueprintHandlers, XBlueprintOperations } from './operations';
```

```ts
// <blueprint>/operations/index.ts — single source of both aggregates
export * as XBlueprintOperations from './definitions';
export const XHandlers = OperationHandlerSet.lazy(...);
```
