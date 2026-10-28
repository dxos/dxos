---
'@dxos/react-ui-menu': minor
'@dxos/plugin-presenter': minor
---

`ActionToolbar` lays out start and end zones and multiple rows, and ends with an overflow menu (⋮) that takes collapsible groups as submenus while a row is too narrow. Items and groups say where they go with `placement` (`ToolbarPlacement` on `MenuItemChrome`). A plain named group renders inline in a toolbar and as a submenu in a menu; another component extends it with `MenuBuilder.extend(groupId, …)`, including the overflow menu (`TOOLBAR_OVERFLOW_ID`). `EditorToolbar` declares an insert group (`EDITOR_TOOLBAR_INSERT_GROUP`) and an overflow menu for consumers to extend. `Editor.ToolbarMenu` renders the same actions as a menu; in a menu the overflow group's items follow the others instead of nesting.

Breaking: `ActionToolbar` no longer takes `children` or `start`. Add hand-written controls as `custom` items (`MenuBuilder.custom`) and labels as `text` items (`MenuBuilder.text`); another component extends a toolbar through `customActions`, now a prop of `ActionToolbar` itself.

Presenter slides gain two layouts, `three-cols` (`::middle::`, `::right::`) and `two-by-two` (`::right::`, `::bottom-left::`, `::bottom-right::`); "Start next column" inserts the marker of the column after the cursor's.
