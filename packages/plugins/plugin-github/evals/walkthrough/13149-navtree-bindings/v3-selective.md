# Fix graph key binding scopes and stop re-registering unchanged bindings

Navtree registers a hotkey for every graph action, scoped to the node it belongs to. The scope was
built wrong, so a per-object shortcut such as presenter's `shift+meta+p` never became active, and
every graph update re-registered every binding regardless of whether it had changed. This fixes
the scope and adds a cheap equality check before re-registering.

## Scope bindings to the parent node, not a rebuilt path

The old code rebuilt the scope by joining `path.slice(0, -1)`, but the parent node's id already is
the full scope path — joining it again produced a path that repeated every prefix and never matched
the scope the UI actually sets when an object is attended. The fix scopes each binding to the
parent's id directly.

```diff file=packages/plugins/plugin-navtree/src/capabilities/keyboard.ts lines=45-73

```

## Skip re-registering an unchanged binding

This module reruns on every graph change, and each store mutation notifies every subscriber, so
re-registering every binding on every pass fans out unnecessary work across the app. The fix
compares the existing entry's hotkey and label and returns early when neither changed.

An unchanged binding keeps the closure it was registered with, so its `action` would still resolve
the graph node it captured at registration time, not the current one. The fix resolves the node
from the graph when the binding fires instead of closing over it.

## Allow scoped hotkeys to share a shortcut

Zag's conflict check ignores scopes, so N per-object bindings sharing one hotkey would each warn
about every other, an N-squared blow-up now that bindings are correctly scoped per object.

```diff file=packages/ui/react-primitives/react-focus/src/hotkey-store.ts lines=20-29

```

The existing scope test drops its comment about `conflictBehavior: 'warn'`, since the store no
longer runs in that mode.

```diff file=packages/ui/react-primitives/react-focus/src/hotkeys.test.tsx lines=170-176

```

## Exclude the keyboard module where there is no document

The keyboard capability listens on `document`, which does not exist in node or workerd. Declaring
`environments: []` keeps it from loading there instead of failing at import time.

```diff file=packages/plugins/plugin-navtree/src/capabilities/index.ts lines=40-47

```

## Browser test coverage for the reconciliation

Verifying scope and reconciliation needs a real `document` to dispatch key events against, so this
adds a `plugin.browser.test.ts` run under `chromium` rather than node. One test expands a graph
action and asserts its registered scope equals the object node's id, then presses the shortcut with
that scope active. The other bumps a reactive atom to add a second action, asserts only the new
binding was registered, and confirms the kept binding still fires the current action rather than a
stale closure.

```diff file=packages/plugins/plugin-navtree/src/plugin.browser.test.ts lines=124-180

```

```diff file=packages/plugins/plugin-navtree/vite.config.ts lines=22-26

```

```diff file=packages/plugins/plugin-navtree/moon.yml lines=4-10

```
