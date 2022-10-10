# Class `TestModel`
> Declared in [`packages/core/echo/model-factory/src/testing/test-model.ts`](https://github.com/dxos/protocols/blob/main/packages/core/echo/model-factory/src/testing/test-model.ts#L36)

Abstract base class for Models.
Models define a root message type, which is contained in the parent Item's message envelope.

## Constructors
```ts
const newTestModel = new TestModel(
_meta: ModelMeta<any, any, any>,
_itemId: string,
_getState: Function,
_mutationWriter: MutationWriter<TestItemMutation>
)
```

## Properties

## Functions
