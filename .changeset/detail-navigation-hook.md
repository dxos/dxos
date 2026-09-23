---
'@dxos/app-toolkit': minor
'@dxos/plugin-inbox': minor
'@dxos/plugin-tasks': patch
'@dxos/react-ui-task': patch
---

`useDetailNavigation` in `@dxos/app-toolkit/ui` is the reading gesture a master-detail list performs: it publishes the row as the list's selection and then shows the detail — in a companion beside the list where the host contributes one and the viewport has room, otherwise as a plank at the host's deck level, and always in a plank of its own for a modified (meta) activation. The mailbox, the calendar and a project's task ledger now share it; the mailbox gains a `Message` companion and `Calendar` declares a `calendar → event` deck chain.
