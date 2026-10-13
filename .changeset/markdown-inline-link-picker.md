---
'@dxos/plugin-markdown': patch
'@dxos/react-ui-editor': patch
---

Typing `@` in a document filters the link picker inline again, so focus stays in the editor and arrow keys and Enter pick a row. The query can run past a space while it still matches an object, and the menu closes, leaving the text, once it doesn't. The picker lists the same objects as `ObjectCombobox`, labelled the same way and with each type's coloured icon. The editor menu gains `multiWordTriggers`, `EditorMenuGroup.fallback` and `EditorMenuItem.iconHue` for this.
