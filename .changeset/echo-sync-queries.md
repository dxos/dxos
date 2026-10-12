---
'@dxos/echo': minor
'@dxos/plugin-inbox': patch
---

Live queries reflect a local write before the writing call returns: subscribers are notified synchronously, once per `Obj.update` or `db.add`, and an index result never re-adds an object a local edit has disqualified. Adds `Query.characteristics()` and `completeness`/`sources` on `QueryResult`. Behaviour change: a subscriber that writes from its callback now does so after the triggering write has committed but before it returns, rather than on a later microtask. The inbox message header now reads its tag chips reactively from the tag index, which it had only seen through a late query notification.
