---
'@dxos/compute': minor
---

Feed triggers now report `isUpdate` on each delivered event, distinguishing a new feed item from a re-append (update) of an existing id. Feed trigger specs gained an `ignoreUpdates` option to skip invoking on update deliveries while still advancing the cursor.
