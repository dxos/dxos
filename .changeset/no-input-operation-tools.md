---
# multiple-changesets: an assistant tool-projection fix and an Interactive Brokers sync fix — unrelated bugs in different packages that a reader would look up separately.
'@dxos/assistant': patch
---

Fix agent requests failing when a space holds an operation that takes no input. A `Schema.Void` input was rendered as `{type: 'null'}` when persisted and read back as `Schema.Null`, which the tool projection rejected — failing the entire request rather than the one tool. An operation that still cannot be projected is now logged and excluded from context instead of aborting the request.
