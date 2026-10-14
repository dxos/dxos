---
'@dxos/echo-react': patch
---

`useQuery` keeps its query and subscription across renders when the caller passes an inline filter, including in components built with the React Compiler. The editor's menus no longer rebuild the editor, and so blur it mid-keystroke, when the caller's `getMenu` or inline trigger arrays change identity.
