# Class `TestModel`
> Declared in [`packages/core/echo/model-factory/src/testing/test-model.ts`](https://github.com/dxos/protocols/blob/main/packages/core/echo/model-factory/src/testing/test-model.ts#L36)

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

---
- TestModel : Class
- constructor : Constructor
- new TestModel : Constructor signature
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
- meta : Property
- itemId : Accessor
- itemId : Get signature
- keys : Accessor
- keys : Get signature
- modelMeta : Accessor
- modelMeta : Get signature
- properties : Accessor
- properties : Get signature
- readOnly : Accessor
- readOnly : Get signature
- get : Method
- get : Call signature
- key : Parameter
- set : Method
- set : Call signature
- key : Parameter
- value : Parameter
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
