---
'@dxos/echo': patch
---

`Any` producers now name their `type_url` convention explicitly.

`@dxos/protocols/buf` exports `anyPackPrefixed` alongside `anyPackBare`, and a new
`@dxos/rules/no-raw-any-pack` lint rule rejects raw `anyPack`. Both forms are required at the EDGE
boundary by different readers — credential assertions resolve by bare type name, while the router and
messenger strip a `type.googleapis.com/` prefix — and neither reader errors on the wrong form, so the
choice now has to be made at the call site rather than inherited from buf's default.

Existing call sites moved to whichever helper preserves their current behaviour, so there is no wire
change. One exception: `@dxos/plugin-script`'s `getAccessCredential` packed its `ServiceAccess`
assertion with the prefix, which EDGE's registry does not resolve; it now emits the bare form like
every other assertion emitter.
