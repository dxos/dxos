# Class `Database`
> Declared in package `@dxos/echo-db`

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
