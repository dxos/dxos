# Class `TestModel`
> Declared in package `@dxos/model-factory`

Abstract base class for Models.
Models define a root message type, which is contained in the parent Item's message envelope.

## Constructors
```ts
new TestModel(
_meta: ModelMeta<any, any, any>,
_itemId: string,
_getState: Function,
_mutationWriter: MutationWriter<TestItemMutation>
)
```
