# Class `Database`
> Declared in [`packages/core/echo/echo-db/src/packlets/database/database.ts`](https://github.com/dxos/protocols/blob/main/packages/core/echo/echo-db/src/packlets/database/database.ts#L46)

Represents a shared dataset containing queryable Items that are constructed from an ordered stream of mutations.

## Constructors
```ts
new Database(
_modelFactory: ModelFactory,
_backend: DatabaseBackend,
memberKey: PublicKey
)
```
Creates a new database instance.  `database.initialize()`  must be called afterwards to complete the initialization.

---
- Database : Class
- constructor : Constructor
- new Database : Constructor signature
- _modelFactory : Parameter
- _backend : Parameter
- memberKey : Parameter
- _itemManager : Property
- _state : Property
- entityUpdate : Accessor
- entityUpdate : Get signature
- isReadOnly : Accessor
- isReadOnly : Get signature
- state : Accessor
- state : Get signature
- update : Accessor
- update : Get signature
- _assertInitialized : Method
- _assertInitialized : Call signature
- createDataServiceHost : Method
- createDataServiceHost : Call signature
- createItem : Method
- createItem : Call signature
- M : Type parameter
- options : Parameter
- createLink : Method
- createLink : Call signature
- M : Type parameter
- S : Type parameter
- T : Type parameter
- options : Parameter
- createSnapshot : Method
- createSnapshot : Call signature
- destroy : Method
- destroy : Call signature
- getItem : Method
- getItem : Call signature
- itemId : Parameter
- initialize : Method
- initialize : Call signature
- reduce : Method
- reduce : Call signature
- R : Type parameter
- result : Parameter
- filter : Parameter
- select : Method
- select : Call signature
- filter : Parameter
- waitForItem : Method
- waitForItem : Call signature
- T : Type parameter
- filter : Parameter
