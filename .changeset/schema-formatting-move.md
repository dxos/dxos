---
'@dxos/echo': minor
---

Move `formatForDisplay` and `formatForEditing` from `@dxos/react-ui-form` to `@dxos/schema` — they
are pure value formatters, and importing them pulled React into non-UI consumers. Import them from
`@dxos/schema` instead. `@dxos/plugin-graph` also no longer re-exports its React hooks from the
package root; import them from `@dxos/plugin-graph/hooks`.
