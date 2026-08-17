---
'@dxos/echo': patch
---

Fix two ECHO mutation defects that destroyed data on reorder. `splice`, `pop`, and `shift` now return elements in the same form the array's accessors do, so an element taken out can be put back in; previously they returned the stored encoding, which failed schema validation on re-insert after the removal had already committed. Clearing a property by assigning `undefined` now deletes it instead of asserting `undefined` against the property schema, which rejected the clear for optional properties of a stored (mutable) schema.
