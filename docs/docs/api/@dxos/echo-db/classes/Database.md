# Class `Database`
> Declared in [`packages/core/echo/echo-db/src/packlets/database/database.ts`](https://github.com/dxos/protocols/blob/main/packages/core/echo/echo-db/src/packlets/database/database.ts#L46)

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
