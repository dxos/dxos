---
'@dxos/echo': patch
'@dxos/echo-client': patch
---

A malformed `echo:` reference no longer throws `Unsupported URI kind` when read: the resolver returns `undefined` and logs `malformed echo reference` once per URI. Decoding a reference envelope now rejects an `echo:` URI that does not parse, such as a full URI wrapped in `echo:///`, with `Invalid echo URI: <uri>`.
