# Class `Model`
> Declared in [`packages/core/echo/model-factory/src/model.ts`](https://github.com/dxos/protocols/blob/main/packages/core/echo/model-factory/src/model.ts#L14)

Abstract base class for Models.
Models define a root message type, which is contained in the parent Item's message envelope.

## Constructors
```ts
new Model(
_meta: ModelMeta<any, any, any>,
_itemId: string,
_getState: Function,
_mutationWriter: MutationWriter<TMutation>
)
```

---
- Model : Class
- TState : Type parameter
- TMutation : Type parameter
- constructor : Constructor
- new Model : Constructor signature
- TState : Type parameter
- TMutation : Type parameter
- _meta : Parameter
- _itemId : Parameter
- _getState : Parameter
- __type : Type literal
- __type : Call signature
- _mutationWriter : Parameter
- _getState : Property
- __type : Type literal
- __type : Call signature
- update : Property
- itemId : Accessor
- itemId : Get signature
- modelMeta : Accessor
- modelMeta : Get signature
- readOnly : Accessor
- readOnly : Get signature
- subscribe : Method
- subscribe : Call signature
- __type : Type literal
- __type : Call signature
- listener : Parameter
- __type : Type literal
- __type : Call signature
- result : Parameter
- toJSON : Method
- toJSON : Call signature
- __type : Type literal
- id : Property
- type : Property
- toString : Method
- toString : Call signature
- write : Method
- write : Call signature
- mutation : Parameter
