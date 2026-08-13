---
'@dxos/echo': minor
---

In-memory ECHO objects and relations now implement Effect's `Hash` and `Equal` traits, keyed by entity `id`. `Hash.hash(obj)` is the hash of the object's `id` — cheap, and stable across mutation — instead of a structural digest of the object's contents, so an entity used as a hash-map key (notably `Atom.family`, behind `Obj.atom`) is keyed by identity as documented.

This changes `Equal.equals` for in-memory entities: two entities are equal if and only if they share an `id`. Two structurally identical objects with different ids no longer compare equal. Nested records inside an entity carry no `id` and fall back to reference identity, so structurally identical sub-records of different objects no longer compare equal either. Database-backed objects are unaffected — they are already marked for reference equality.

Since an entity has exactly one live proxy, id and reference identity coincide in normal use; the traits differ from reference identity only if that invariant is violated, in which case both proxies now resolve to a single hash-map entry.
