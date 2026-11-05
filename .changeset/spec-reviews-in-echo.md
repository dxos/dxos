---
'@dxos/compute': minor
---

A spec's compliance reviews are ECHO objects: `@dxos/compute/SpecReview` holds one review of a spec, with the commit it read, its date, its reviewer and a verdict per spec item. plugin-code records them from `.review.mdl` files, through GitHub file sync or a local checkout, and with the `code-create-spec-review` operation, and shows each item's newest verdict beside the spec and on a feature's requirements. A GitHub `FileMapping` can `exclude` globs within its `match`, and when an import answers a changed file with another object, the file's marker and key move to it.
