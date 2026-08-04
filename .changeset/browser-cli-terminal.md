---
'@dxos/cli-util': minor
'@dxos/plugin-devtools': minor
'@dxos/plugin-space': minor
'@dxos/react-ui-terminal': minor
---

Run the dx CLI in the browser. `@dxos/react-ui-terminal` is a new package hosting an `@effect/cli` command tree in a terminal emulator — an Effect `Terminal` and `Console` over xterm, a line editor, and a shell loop — and `@dxos/plugin-devtools` mounts the real `dx` commands on it as a devtools panel.

Getting the commands into a browser bundle needed three changes. `@dxos/cli-util` no longer re-exports the OAuth callback server from its root entry (it moved to `@dxos/cli-util/oauth`, keeping `@effect/platform-bun` out of the default import graph), and `copyToClipboard`/`openBrowser` now resolve to a web implementation outside Node instead of shelling out via `node:child_process`. `@dxos/plugin-space` gains a `./commands` export, and its `database` command is now typed by its services rather than widened to `any` — that widening erased the requirement channel for every command tree composing it, so callers got no indication of which layers they had to provide.
