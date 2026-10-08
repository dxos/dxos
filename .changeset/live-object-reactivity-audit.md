---
'@dxos/react-ui-card': patch
---

Object cards, tiles, headers and lists repaint when the objects they show change. Card bodies behind a surface (form, task, person, organization, project, GitHub and remote-session cards), card and tile labels, kanban titles and items, board layouts, task row tags and artifact chips, thread messages and the object form's tags field read their fields through a subscription. Before, they kept showing the old value after an edit, because they read the live object directly or keyed a memo on a nested ECHO array whose identity never changes. `RemoteSession.isTerminal` now accepts any object with a `state`.

Adds `Obj.tagsAtom(obj)`, which emits an object's meta tags only when the tag list changes, and `useLabel(entity, { fallback })` in `@dxos/echo-react`, which re-renders only when the label string changes and reads a snapshot as is. `Tag.sortTags` accepts anything with a `label`.
