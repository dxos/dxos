---
'@dxos/react-ui-card': minor
'@dxos/react-ui-mosaic': patch
'@dxos/extractor-lib': patch
'@dxos/plugin-inbox': patch
---

`Row.Person` now always renders the actor's avatar, with the contact affordance built in: hovering an avatar whose contact resolves opens that Person's card, and an unresolved one offers to create the contact. The variant is chosen by the presence of `db` (or the new list-friendly `getContact` lookup) rather than an `avatar` flag, which is removed; `ContactAvatar` is exported for surfaces that lay out their own rows, and `size` selects between the dense (6) and message-header (9) avatar.

Also: a virtual list whose first page fits its viewport now extends instead of waiting for a scroll it can never receive; the shared contact extractor refuses machine senders (`no-reply@`, `mailer-daemon@`, qualified role addresses like `invoice+statements+acct_…@stripe.com`); and mailbox summarization summarizes whole conversations rather than individual messages.
