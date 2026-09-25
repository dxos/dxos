---
'@dxos/plugin-projects': patch
'@dxos/plugin-tasks': patch
'@dxos/plugin-jmap': patch
'@dxos/plugin-google': patch
---

`projects.create` projects as the `projectCreate` MCP tool, so the last curated project verb in edge's MCP server can retire — the operation already serialized into the registry and only lacked the annotation.

The entries a headless host imports directly (`./operations`, and plugin-projects' `./skills`) are now guarded against React reaching them, closing the gap that made those imports a silent liability.

`dx-trace-imports` accepts repeated `--export` and `--to`, so one guard covers every entry a headless host imports. Repeating either flag previously stringified the array into a value matching nothing; `--to` failed silently, which is how plugin-jmap's and plugin-google's headless constraints went unenforced.
