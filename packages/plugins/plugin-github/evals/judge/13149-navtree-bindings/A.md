# Fix graph key binding scopes and stop re-registering unchanged bindings

Navtree turns graph actions with a `keyBinding` into hotkeys, one binding per action, rescoped
every time the graph changes. The scope it computed never matched what activated at runtime, so a
shortcut like presenter's `shift+meta+p` never fired. This fixes the scope, stops rebuilding
bindings that have not changed, and keeps the fired action current when a kept binding is reused.

## Scope the binding to the parent node, not the full path

The old code joined every path segment above the action into the scope string. The hotkey store
activates a scope by node id, and a node's id already encodes its own path, so the joined string
never matched an id the store would ever see. The parent node's id is that scope.

```diff file=packages/plugins/plugin-navtree/src/capabilities/keyboard.ts lines=44-56

```

## Skip re-registering an unchanged binding

The sync runs on every graph change, and each store mutation notifies every subscriber. Unregistering
and re-registering a binding whose hotkey and label have not changed only re-fires subscribers for no
change in the store, so the sync now compares against the existing entry and returns early when both
match.

```diff file=packages/plugins/plugin-navtree/src/capabilities/keyboard.ts lines=57-61

```

## Resolve the action node when the binding fires

An unchanged binding keeps the closure it was registered under, so its `action` closed over a graph
node that can go stale between registration and the keypress. The action now looks up the current
node by id at fire time and runs that one instead of the captured node.

```diff file=packages/plugins/plugin-navtree/src/capabilities/keyboard.ts lines=68-76

```

## Allow shared hotkeys across scopes

Zag's conflict check ignores scopes, so two per-object bindings sharing a hotkey warned on every
registration even though only one scope is ever active at a time. The shared store now allows
duplicate hotkeys instead of warning on them.

```diff file=packages/ui/react-primitives/react-focus/src/hotkey-store.ts lines=20-26

```

The existing scope test's justifying comment for `conflictBehavior: 'warn'` no longer applies, since
the store now allows conflicts by default.

```diff file=packages/ui/react-primitives/react-focus/src/hotkeys.test.tsx lines=170-176

```

## Keyboard capability is browser-only

`Keyboard` listens on `document`, which does not exist in node or workerd. Declaring `environments: []`
excludes it from those environments instead of failing to activate there.

```diff file=packages/plugins/plugin-navtree/src/capabilities/index.ts lines=40-46

```

## Browser test coverage for the reconciliation

The fix needs a running DOM to dispatch key events against, so the plugin gets a browser test suite:
one test asserting the binding's scope is the parent node id and that pressing the key with that
scope active fires the action, and a second asserting that a graph update re-registers only the
changed binding while the kept binding still runs the current action.

```diff file=packages/plugins/plugin-navtree/vite.config.ts lines=22-26

```

```diff file=packages/plugins/plugin-navtree/moon.yml lines=1-11

```

```diff file=packages/plugins/plugin-navtree/src/plugin.browser.test.ts

```
