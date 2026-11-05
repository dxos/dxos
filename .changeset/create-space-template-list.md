---
'@dxos/plugin-space': patch
---

Choosing a template in the Create Space dialog no longer scrolls the list, so the press lands on the row under the pointer. The chosen template keeps an orange outline, hover is easier to see, and the dialog's scrollbar sits at its edge. `Listbox.Root` gains `selectionStyle='outline'`.
