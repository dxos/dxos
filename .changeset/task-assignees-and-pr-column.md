---
'@dxos/react-ui-task': minor
'@dxos/plugin-tasks': patch
---

Task list rows show a task's pull requests in their own column on the title line, left of the
assignee. The assignee picker offers the space's members, the owner included (`TaskProperties`
takes `members`), and the assignee chip opens its session card on click instead of hover, which had
left the card stuck open. `tasks.create` and `tasks.update` reject an assignee that names no one — it
must carry a contact, a member's `identityDid`, or an agent session.
