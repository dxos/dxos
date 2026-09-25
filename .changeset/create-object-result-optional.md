---
# multiple-changesets: a create-object contract change and a new storage backend land together only
# because building the latter exposed the former. They touch different packages and different
# readers — someone upgrading plugin-space needs the optional-object note whether or not they have
# ever heard of S3.
'@dxos/plugin-space': minor
'@dxos/react-ui-form': minor
---

`CreateObjectResult.object` is now optional, and so is the value a `CreateEntryOverride.createObject` resolves to. Some creates legitimately finish without an object: the connector create hands off to an OAuth popup or a credential dialog, and the `Connection` appears later, out of band.

The contract previously demanded an object, so `plugin-connector` satisfied it with `undefined as unknown as Obj.Unknown` — and every caller that trusted the type then crashed on it. Creating a Connection threw `Invalid argument 'object': expected object` from `Obj.getURI` as the create-object dialog tried to navigate to the thing that did not exist yet. The three call sites that dereferenced the result (`ObjectFormDialog`, the database app-graph-builder extension, and `DefaultProperties`) now check before navigating; `RefField` already did.

Implementors returning a real object are unaffected. Callers reading `result.object` must now handle `undefined`.
