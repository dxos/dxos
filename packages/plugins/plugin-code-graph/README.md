# @dxos/plugin-code-graph

A Composer canvas of the codebase, built from [code-index](../../../tools/code-index). Boxes are packages,
files and symbols; arrows are imports and package dependencies. The assistant fills and reshapes the graph
by querying the index, and the canvas lays it out three ways: the illustrator's semantic engine, a
force-directed layout, or by dependency rank.

**Dev only.** The browser reaches the index through a `vite dev` route, so it works under
`moon run composer-app:serve` and `tauri dev`, and is inert in a deployed build.

## Running it

```bash
moon run code-index-native:build-native        # once per checkout: the index's store
bun tools/code-index/bin/code-index.ts index    # build or refresh the index
moon run composer-app:serve                     # the dev server runs `code-index mcp` on first use
```

Enable **Code Graph** in the plugin registry, create a Code Graph object, and ask the assistant to draw
something, e.g. "draw the packages plugin-markdown depends on".

Or press `/` on the canvas (or the floating button) for the command bar: one short command such as "clear the
graph" or "what depends on the identity service", run by its own fast model rather than the chat assistant. The
microphone button takes spoken commands through Whistle, on the device. The list button in the bar shows each step of
the last command with its time and the query it ran.

The live end-to-end tests run those commands against the real index and models:

```bash
DX_RUN_MANUAL_TESTS=1 moon run plugin-code-graph:test -- src/command/Command.e2e.test.ts
```

`code-index mcp` holds the store's lock, so stop the dev server before `code-index index` or `serve`.

See [`docs/DESIGN.md`](./docs/DESIGN.md) for how it fits together.
