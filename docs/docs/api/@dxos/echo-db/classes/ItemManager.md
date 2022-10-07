# Class `ItemManager`
> Declared in [`packages/core/echo/echo-db/src/packlets/database/item-manager.ts`](https://github.com/dxos/protocols/blob/main/packages/core/echo/echo-db/src/packlets/database/item-manager.ts#L45)

Manages the creation and indexing of items.

## Constructors
```ts
new ItemManager(
_modelFactory: ModelFactory,
_memberKey: PublicKey,
_writeStream: FeedWriter<EchoEnvelope>
)
```

---
- ItemManager : Class
- constructor : Constructor
- new ItemManager : Constructor signature
- _modelFactory : Parameter
- _memberKey : Parameter
- _writeStream : Parameter
- _entities : Property
- _pendingItems : Property
- debouncedUpdate : Property
- update : Property
- entities : Accessor
- entities : Get signature
- items : Accessor
- items : Get signature
- links : Accessor
- links : Get signature
- _addEntity : Method
- _addEntity : Call signature
- entity : Parameter
- parent : Parameter
- _constructModel : Method
- _constructModel : Call signature
- __namedParameters : Parameter
- constructItem : Method
- constructItem : Call signature
- __namedParameters : Parameter
- constructLink : Method
- constructLink : Call signature
- __namedParameters : Parameter
- createItem : Method
- createItem : Call signature
- modelType : Parameter
- itemType : Parameter
- parentId : Parameter
- initProps : Parameter
- createLink : Method
- createLink : Call signature
- modelType : Parameter
- itemType : Parameter
- source : Parameter
- target : Parameter
- initProps : Parameter
- deconstructItem : Method
- deconstructItem : Call signature
- itemId : Parameter
- getItem : Method
- getItem : Call signature
- M : Type parameter
- itemId : Parameter
- getUninitializedEntities : Method
- getUninitializedEntities : Call signature
- initializeModel : Method
- initializeModel : Call signature
- itemId : Parameter
- processModelMessage : Method
- processModelMessage : Call signature
- itemId : Parameter
- message : Parameter
