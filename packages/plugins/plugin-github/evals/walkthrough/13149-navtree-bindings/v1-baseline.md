# Fix graph key binding scopes and stop re-registering unchanged bindings

Navtree's per-object keyboard shortcuts, such as presenter's `shift+meta+p`, never fired because
the hotkey scope they registered under did not match the scope the app actually activates. This
change fixes the scope computation, stops re-registering bindings that have not changed on every
graph update, and adjusts the shared hotkey store and test infrastructure to match.

## The scope was built from the wrong path segment

The binding's scope was computed by joining the whole path prefix up to the action, but the actual
active scope the app sets is the parent node's id — a single qualified id, not a joined path. The
two never matched, so the binding was registered under a scope that was never active and the
shortcut could never fire.

```diff file=packages/plugins/plugin-navtree/src/capabilities/keyboard.ts lines=48-53

```

## Skipping re-registration when the binding hasn't changed

This registration logic runs on every graph change, and each store mutation notifies every
subscriber. Unregistering and re-registering a binding whose hotkey and label are unchanged is pure
overhead that fans out to every listener for no observable effect, so the update is now skipped
when both fields already match what's stored.

```diff file=packages/plugins/plugin-navtree/src/capabilities/keyboard.ts lines=56-73

```

## The action closure is re-resolved at fire time

Because an unchanged binding now keeps the closure it was registered with, that closure can no
longer capture the graph node directly — the node it captured may be stale by the time the key is
pressed. The action instead re-fetches the current node from the graph when it fires, so a kept
binding still runs against up-to-date node data.

```diff file=packages/plugins/plugin-navtree/src/capabilities/keyboard.ts lines=80-92

```

## Allowing same-hotkey conflicts across scopes

Zag's built-in conflict check ignores scopes entirely, so registering the same hotkey (e.g. a
`Present` shortcut) for N different objects would warn on every pairwise combination. The shared
hotkey store now allows same-hotkey registrations rather than warning, since scoping — not global
uniqueness — is what actually prevents collisions in this system.

```diff file=packages/ui/react-primitives/react-focus/src/hotkey-store.ts lines=20-26

```

The existing scope test's comment referencing the old `warn` behavior is updated to match, since the
default conflict behavior it described no longer applies.

```diff file=packages/ui/react-primitives/react-focus/src/hotkeys.test.tsx lines=168-175

```

## Excluding the keyboard module from environments without `document`

The keyboard capability listens on `document`, which does not exist in node or workerd. It is now
declared with an empty `environments` list so it is excluded from those runtimes rather than
failing to load.

```diff file=packages/plugins/plugin-navtree/src/capabilities/index.ts lines=36-43

```

## A browser test exercises the real reconciliation path

The new binding logic depends on browser APIs (keyboard events, `document`) that a node test
environment cannot exercise, so this PR adds a dedicated browser test suite for the plugin and wires
it into the moon and vite configuration. The test builds a small host plugin with a versioned graph
action, drives a graph update that changes the action set, and asserts both that only the changed
binding is re-registered and that firing a kept binding still runs the current action.

```diff file=packages/plugins/plugin-navtree/src/plugin.browser.test.ts lines=124-180

```

```diff file=packages/plugins/plugin-navtree/vite.config.ts lines=22-26

```

```diff file=packages/plugins/plugin-navtree/moon.yml lines=1-10

```
