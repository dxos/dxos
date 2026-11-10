---
'@dxos/compute-runtime': patch
'@dxos/echo-client': patch
'@dxos/protocols': patch
'@dxos/plugin-inbox': patch
'@dxos/plugin-magazine': patch
'@dxos/plugin-markdown': patch
'@dxos/plugin-thread': patch
'@dxos/plugin-google': patch
'@dxos/plugin-jmap': patch
---

Plugin operations now work when EDGE runs them from their own plugin bundles. An invocation's writes are saved even when its operation declares no `Database.Service`, so `tasks.move` and the Gmail, Calendar and JMAP materialize operations keep what they create. A bundle's skills keep `agentCanEnable`, so an agent can still enable them. Fixes in individual plugins:

- `thread.createChannel` saves the channel in the space, and the feed backend loads the channel's feed before appending.
- Markdown creates documents with an empty history.
- Magazine's `loadPostContent` loads its post.
- Loading an object by reference resolves its type from the type sources when the registry lacks it, so an object whose type another plugin publishes arrives with a schema.
- Unsubscribing from a sender keeps the first skip filter, and plugin-inbox registers the `Tag` type it creates.

plugin-google and plugin-jmap now ship EDGE bundles.
