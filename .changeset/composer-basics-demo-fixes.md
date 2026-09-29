---
'@dxos/plugin-space': patch
'@dxos/plugin-table': patch
'@dxos/plugin-markdown': patch
'@dxos/plugin-map': patch
'@dxos/plugin-kanban': patch
---

Fixes found driving a Composer basics demo. Creating an object from an `@` link keeps the typed name. Creating a type now opens its table. Types and views navigate to their node in the Database section instead of a plank stuck on "Loading…". A table can be created without picking a type: it gets a new type named after it. The table's add-column button appears for a database type. The type and location pickers in the create forms list their options and show their labels. A map created on a table's type offers the type's location properties. Toggling a world-view map shows the whole globe.
