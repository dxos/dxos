---
'@dxos/schema': minor
'@dxos/plugin-inbox': patch
---

BREAKING: `FeedAnnotation` now carries `{ property: string }` naming the property that holds the feed reference, instead of a bare `true`. A bare `true` said a type owned a feed but not which property held it, so every consumer hardcoded `.feed`. Use the new `getFeedRef(obj)` and `isFeedOwnerSchema(schema)` helpers instead of reading the property directly.
