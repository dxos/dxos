---
'@dxos/react-ui-list': minor
'@dxos/react-ui-task': minor
---

`Tree` takes a `virtualize` prop, which mounts only the rows in view using `@dxos/react-ui-virtual`
— the same windowing the trace timeline and the message feed use — and an optional `scrollerRef`
naming the element that scrolls it. A task list turns it on, so a project's backlog renders the
rows a reader can see rather than all of them. A tree with disclosable branches, or one that
addresses an item at two paths, renders whole.
