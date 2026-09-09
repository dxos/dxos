---
'@dxos/react-ui': minor
---

Adds `Toc`, a table of contents on Ark's toc machine: `Root` takes the headings as `{ value, depth }` items and an optional scroll container, watches which headings are in view and marks their links (`aria-current="location"`, `data-active`); `Indicator` is a bar beside the active items; `Item` indents by depth; `Link` scrolls the heading into view within the container instead of jumping the page. Headings must carry the ids the items name.
