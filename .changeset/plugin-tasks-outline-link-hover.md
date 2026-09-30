---
'@dxos/plugin-tasks': patch
'@dxos/echo': patch
---

Promoted task links in an outline behave: hovering one shows the task's preview card instead of following the link (the outline now follows a link on click, Enter or Space only), and the card resolves. The task card read its status options with a pre-v4 annotation call and threw; it now reads them through `getPropertyMetaAnnotation`, which in turn reads property meta through an optional property's union (`Schema.optional` wraps the annotated schema, so the meta sat on a member and was missed). A card surface that does throw now renders its message in the card's content column rather than the icon gutter.
