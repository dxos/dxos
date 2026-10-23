---
'@dxos/react-ui-menu': minor
---

`ActionToolbar` lays out start and end zones and multiple rows, and ends with an overflow menu (⋮) that takes collapsible groups as submenus while a row is too narrow. Items and groups say where they go with `placement` (`ToolbarPlacement` on `MenuItemChrome`). A plain named group renders inline in a toolbar and as a submenu in a menu; another component extends it with `MenuBuilder.extend(groupId, …)`, including the overflow menu (`TOOLBAR_OVERFLOW_ID`). `EditorToolbar` declares an insert group (`EDITOR_TOOLBAR_INSERT_GROUP`) and an overflow menu for consumers to extend.
