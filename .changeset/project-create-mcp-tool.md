---
'@dxos/plugin-projects': patch
'@dxos/plugin-tasks': patch
'@dxos/plugin-jmap': patch
'@dxos/plugin-google': patch
---

`projects.create` projects as the `projectCreate` MCP tool, so the last curated project verb in edge's MCP server can retire — the operation already serialized into the registry and only lacked the annotation.

The entries a headless host imports directly (`./operations`, and plugin-projects' `./skills`) are now guarded against React reaching them, closing the gap that made those imports a silent liability.

Fixes two guards that passed without checking anything: `dx-trace-imports --to` takes one glob, and both the repeated-flag and comma-separated forms silently match nothing, so plugin-jmap's and plugin-google's headless constraints were unenforced. Both now use the brace form and pass for real.
