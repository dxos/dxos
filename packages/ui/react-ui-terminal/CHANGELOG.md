# @dxos/react-ui-terminal

## 0.12.0

### Minor Changes

- d79aaf4: Run the dx CLI in the browser. `@dxos/react-ui-terminal` is a new package hosting an `@effect/cli` command tree in a terminal emulator — an Effect `Terminal` and `Console` over xterm, a line editor, and a shell loop — and `@dxos/plugin-devtools` mounts the real `dx` commands on it as a devtools panel.

  Getting the commands into a browser bundle needed three changes. `@dxos/cli-util` no longer re-exports the OAuth callback server from its root entry (it moved to `@dxos/cli-util/oauth`, keeping `@effect/platform-bun` out of the default import graph), and `copyToClipboard`/`openBrowser` now resolve to a web implementation outside Node instead of shelling out via `node:child_process`. `@dxos/plugin-space` gains a `./commands` export, and its `database` command is now typed by its services rather than widened to `any` — that widening erased the requirement channel for every command tree composing it, so callers got no indication of which layers they had to provide.

  CLI command modules now activate on demand rather than at startup: `AppCapability.commands` gates on the new `ActivationEvents.CommandsRequested`, which `createCliApp` awaits during boot and a browser host fires when a terminal opens. A host that reads `Capabilities.Command` without going through `createCliApp` must fire and await that event first, or the tree comes back empty.

### Patch Changes

- Updated dependencies [96f94c2]
- Updated dependencies [d194929]
- Updated dependencies [557e243]
- Updated dependencies [813069c]
- Updated dependencies [098a0bb]
- Updated dependencies [557e243]
- Updated dependencies [29543ca]
- Updated dependencies [d4b4919]
- Updated dependencies [0a3e9dd]
- Updated dependencies [306f50d]
- Updated dependencies [1d6f730]
- Updated dependencies [fc83abd]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [32584c9]
- Updated dependencies [928e0b2]
- Updated dependencies [f9816c0]
  - @dxos/react-ui@0.12.0
  - @dxos/ui-theme@0.12.0
  - @dxos/effect@0.12.0
