---
'@dxos/test-utils': patch
---

`ClaudeAgent` can load plugins with `pluginDirs`, and with `bare: false` runs Claude Code's full toolset against an empty config directory instead of `--bare`, which leaves only Bash, Edit and Read.
