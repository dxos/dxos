---
'@dxos/plugin-inbox': minor
---

Fact analysis and the CRM pipeline are now contributed feed processors rather than toolbar menu
items. plugin-brain contributes the `analyze` pass alongside the `FactStore` layer it needs, so a
deployment without brain has no analyze pass to run instead of one that dies resolving a service
nobody provided — the missing-`FactStore` case becomes structurally impossible rather than merely
handled. plugin-crm's cursored pipeline becomes the `crm` processor declared `after: ['contacts']`,
consuming plugin-inbox's contact extraction instead of competing with it from a separate button.
`Process CRM` and `Analyze` are gone from the mailbox menu; `Find images` stays, being space-wide
rather than a feed pass.
