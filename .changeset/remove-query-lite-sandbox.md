---
'@dxos/echo-query': minor
'@dxos/echo': minor
---

Remove the `query-lite` DSL mirror and the QuickJS query sandbox.

`@dxos/echo-query` no longer exports `./sandbox` (`QuerySandbox`) or the `./api.d.ts` subpath, and
`@dxos/echo` no longer re-exports the `Query.ProjectionTypeId` brand type. Nothing in the workspace
consumed these outside of a storybook: the DSL editors used across Composer parse queries with
`QueryBuilder` from the package's main entry point, which is unchanged. Removing the mirror also
drops the requirement that every new query feature be reimplemented in a parallel DSL.
