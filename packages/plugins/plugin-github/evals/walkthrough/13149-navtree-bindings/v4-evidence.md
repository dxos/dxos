# Fix graph key binding scopes and stop re-registering unchanged bindings

This change fixes navtree's key bindings so a shortcut like presenter's `shift+meta+p` fires when
its object is attended, instead of never activating. It also stops the sync from re-registering
bindings that have not changed, and makes the shared hotkey store tolerate several commands
sharing one hotkey.

## The scope was never the attended node

Each graph action can carry a `keyBinding`. The scope it registers under decides which attended
node makes it live.

```diff file=packages/plugins/plugin-navtree/src/capabilities/keyboard.ts lines=44-73

```

The old scope was built by joining every path segment up to the action's own position, which
repeats each ancestor's id as a prefix rather than naming the parent node itself. The scope a
component sets with `setHotkeyScope` is a single node id, so that joined string never matched it
and the binding never activated. The parent's id in `path` is already the full scope path, so
using `path.at(-2)` directly gives the scope the store actually compares against.

## Re-registering only what changed

The sync runs on every graph change. Unregistering and re-registering every binding each time
means every store mutation notifies every subscriber, even when nothing about the binding
changed.

```diff file=packages/plugins/plugin-navtree/src/capabilities/keyboard.ts lines=57-62

```

Skipping unregister/register when the hotkey and label already match keeps a graph update from
generating churn proportional to the number of bindings rather than the number that actually
changed.

## Closures on kept bindings go stale

A binding that is kept across a graph update still needs to run against the current node, not the
node it captured when first registered.

```diff file=packages/plugins/plugin-navtree/src/capabilities/keyboard.ts lines=63-77

```

The action closure now resolves the node from the graph at fire time instead of closing over the
node passed in at registration, so a kept binding still invokes the up-to-date action.

## Allowing shared hotkeys across scopes

Zag's conflict check ignores scopes, so registering the same hotkey for many per-object bindings
warned once per pair of objects sharing it.

```diff file=packages/ui/react-primitives/react-focus/src/hotkey-store.ts lines=20-25

```

Setting `conflictBehavior: 'allow'` on the shared store removes the quadratic warning volume that
scoped, per-object hotkeys would otherwise produce, since every object using the same shortcut is
a separate registration under Zag's scope-blind check.

## Excluding the keyboard module where there is no document

The keyboard capability listens on `document`, which does not exist in node or workerd test
environments.

```diff file=packages/plugins/plugin-navtree/src/capabilities/index.ts lines=41-47

```

Declaring `environments: []` on the module keeps it from loading in those environments, matching
the constraint stated in the accompanying comment.

## Browser test coverage for both fixes

A new browser test exercises the scope fix and the reconciliation fix together: it expands a graph
node with a key-bound action, confirms the binding's scope equals the parent node's id, then fires
the key while that node is attended.

```diff file=packages/plugins/plugin-navtree/src/plugin.browser.test.ts lines=209-230

```

A second test spies on `hotkeyStore.register` across a graph update that adds one new action and
keeps an existing one, asserting the spy was only called for the new binding, then fires the kept
binding's hotkey to confirm it still runs the current action.

```diff file=packages/plugins/plugin-navtree/src/plugin.browser.test.ts lines=232-265

```

Running these requires the package's test config to spin up a real browser, and moon to know a
browser test task exists for it.

```diff file=packages/plugins/plugin-navtree/vite.config.ts lines=1-26

```
