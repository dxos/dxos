# Class `Database`
> Declared in [`packages/core/echo/echo-db/dist/src/packlets/database/database.d.ts`](undefined)

Represents a shared dataset containing queryable Items that are constructed from an ordered stream of mutations.

## Constructors
```ts
const newDatabase = new Database(
_modelFactory: ModelFactory,
_backend: DatabaseBackend,
memberKey: PublicKey
)
```
Creates a new database instance.  `database.initialize()`  must be called afterwards to complete the initialization.

## Properties

## Functions
