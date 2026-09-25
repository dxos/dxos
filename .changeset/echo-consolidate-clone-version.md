---
'@dxos/echo': minor
'@dxos/echo-client': minor
---

Remove the duplicate clone and version APIs from `@dxos/echo-client`. The deprecated `clone` / `CloneOptions` are gone — use `Obj.clone(obj, { retainId, deep })`, whose `deep: 'all'` clones a referenced graph while preserving the references between the clones. `getVersion` and `ObjectVersion` are gone too — use `Obj.version(obj)`, which returns an `Obj.Version` carrying `automergeHeads`, and compare with `Obj.compareVersions` rather than by structural equality.

Filter evaluation over a live entity, a raw Automerge document, and the `ObjectJSON` form now shares one AST walk (`makeFilterMatcher` in `@dxos/echo/internal`), so the three matchers can no longer drift. A filter property whose key starts with `@` addresses an annotation rather than data and is now ignored uniformly, and object meta is read only when a filter actually constrains it.
