---
'@dxos/app-toolkit': patch
'@dxos/assistant-toolkit': patch
'@dxos/plugin-assistant': patch
'@dxos/plugin-markdown': patch
'@dxos/plugin-search': patch
'@dxos/react-ui-chat': patch
'@dxos/react-ui-feed': patch
---

The chat prompt is redesigned. One picker chooses the agent, where it runs (this device or EDGE) and the model. Skills load as `/` commands, and `@` mentions an object, which joins the chat's context when the message is sent. A "+" menu adds files, objects, commands and MCP servers; "Add an object…" opens the search dialog as a picker (`SearchOperation.SelectObject`). The chat's tasks and its context are two drawers above the prompt, and other plugins can add sections to the context drawer (`ChatSurface.ChatDetails`).

The `@` menus in the chat and in the markdown editor now run a full-text search once typing pauses, through `ObjectCombobox.useSearch` in `@dxos/app-toolkit`; the markdown `@` menu now matches body text as well as names. `searchQuery`, `searchFilter`, `byRelevance` and `useListedTypeUris` moved to `ObjectCombobox` from plugin-search, which no longer exports `buildSearchQuery`, `buildSearchFilter` or `useSearchableTypeUris`.

Replies no longer stop rendering when the thread's view is switched while they stream.
