---
'@dxos/compute': minor
---

A spec's compliance reviews are ECHO objects: `@dxos/compute/SpecReview` holds one review of a spec, with the commit it read, its date, its reviewer and a verdict per spec item. plugin-code records them from `.review.mdl` files, through GitHub file sync or a local checkout, and with the `code-create-spec-review` operation, and shows each item's newest verdict beside the spec and on a feature's requirements. A spec lists its reviews in the `SpecReview.ReviewsAnnotation`, and a review's `date` may carry a UTC time to order two reviews of one day. A GitHub `FileMapping` can `exclude` globs within its `match`. GitHub file sync moves a file's marker and key when an import answers with another object, and re-imports a file through the mapping that now claims it, so review files a binding held as specs become reviews.
