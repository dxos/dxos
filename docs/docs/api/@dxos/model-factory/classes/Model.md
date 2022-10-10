# Class `Model`
> Declared in [`packages/core/echo/model-factory/src/model.ts`](https://github.com/dxos/protocols/blob/main/packages/core/echo/model-factory/src/model.ts#L14)

Abstract base class for Models.
Models define a root message type, which is contained in the parent Item's message envelope.

## Constructors
```ts
const newModel = new Model(
_meta: ModelMeta<any, any, any>,
_itemId: string,
_getState: Function,
_mutationWriter: MutationWriter<TMutation>
)
```

## Properties

## Functions
