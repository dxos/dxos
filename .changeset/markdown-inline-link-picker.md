---
'@dxos/plugin-markdown': patch
'@dxos/react-ui-editor': patch
---

Typing `@` in a document filters the link picker inline again, so focus stays in the editor and arrow keys and Enter pick a row. The query can hold spaces, so a whole phrase can match an object or name a new one; a double space, moving the cursor out of the query, Escape (which keeps the text) or Enter ends it. The picker lists the same objects as `ObjectCombobox`, labelled the same way and with each type's coloured icon; the editor menu gains `multiWordTriggers` and `EditorMenuItem.iconHue` for this. Creating an object from the picker now makes exactly one object, keeps the typed name for a drawing too, and leaves the cursor after the new link: the create dialog ignores a second pick while it closes, and closing any app dialog returns focus to where it was before it opened.
