---
'@dxos/echo': minor
---

Add `Ref.byAnnotation(annotationId)`, a reference schema constrained by an annotation on the target's schema rather than by a concrete typename, so a schema can express "a ref to any type carrying X". The constraint is enforced where references are validated (operation input decoding) and survives a JSON schema round trip.

BREAKING: `FeedAnnotation` (`@dxos/schema`) now carries `{ property: string }` naming the property that holds the feed reference, instead of a bare `true`. Use the new `getFeedRef(obj)` and `isFeedOwnerSchema(schema)` helpers rather than reading `.feed` directly.
