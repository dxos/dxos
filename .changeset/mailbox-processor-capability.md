---
'@dxos/plugin-inbox': minor
---

Mailbox feed processors are now contributed, not enumerated. `ScanMailbox` used to hold every pass it
could run in a literal `Record<MailboxTier, () => Stage[]>`, so nothing outside plugin-inbox could add
one — which is why plugin-brain injects `Analyze` as a toolbar menu item rather than a pipeline stage.
Plugins now contribute an `InboxCapabilities.MailboxProcessor`, and the cascade resolves them into a
run order from the `after` edges each declares. plugin-inbox contributes its own five through the same
seam, so there is no privileged built-in path to drift from the contributed one.

`stages[].operation` in the output is now `stages[].processor` and carries the processor id rather
than the operation DXN — the id is also the topology key and the cursor tag. `MAILBOX_TIER_ORDER` is
removed: a tier selects which processors run, the edges decide the order.
