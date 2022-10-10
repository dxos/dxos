# Interface `DatabaseBackend`
> Declared in [`packages/core/echo/echo-db/src/packlets/database/database-backend.ts`](.)

Generic interface to represent a backend for the database.

Interfaces with ItemManager to maintain the collection of entities up-to-date.
Porvides a way to query for the write stream to make mutations.
Creates data snapshots.
