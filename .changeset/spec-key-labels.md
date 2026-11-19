---
'@dxos/plugin-projects': patch
---

A spec's plain text now shows each feature and requirement by its label (`F-3`, `F-3.2`), as the forms do, in place of the random key the text stores, and a key can no longer be edited there. A label can still be selected on its own, and copying it copies the label. Enter at the end of a requirement starts the next one under a fresh key, ready for its text, and Backspace on an empty requirement removes it. A reference field such as `depends` shows the label of the item it names.
