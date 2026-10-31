---
'@dxos/app-toolkit': minor
'@dxos/util': minor
'@dxos/plugin-space': minor
'@dxos/plugin-markdown': minor
'@dxos/plugin-sheet': minor
'@dxos/plugin-table': minor
---

Add `ExportOperation.Print` and `ExportOperation.Save` with a per-type `AppCapabilities.Exporter` capability. Objects whose type contributes an exporter get "Print…" and "Save as file…" on their article menu. Markdown saves `.md`, sheets save `.csv`, and tables save `.dx.json`. Print opens the browser print dialog, which can save a PDF. `@dxos/util` gains `printHtml`, `htmlTable` and `escapeHtml`.
