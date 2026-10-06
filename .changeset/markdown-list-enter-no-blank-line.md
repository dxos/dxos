---
'@dxos/ui-editor': patch
---

Pressing Enter on an empty second bullet in the markdown editor now ends the list. It used to insert a blank line that made the list loose, after which every Enter in that list added another blank line.
