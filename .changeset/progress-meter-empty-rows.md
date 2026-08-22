---
'@dxos/app-toolkit': patch
---

`ProgressMeter` no longer reserves height for rows it does not render. Its grid declared three fixed tracks (`24px 4px 24px`) while the bar renders only for a task with a known total and the detail row only when there is a note, an ETA, or an error — so an indeterminate task with neither showed one line of text above ~28px of blank statusbar, and an indeterminate task *with* a note pushed that note into the 4px bar track. Rows are now auto-sized and the detail row is omitted when empty.
