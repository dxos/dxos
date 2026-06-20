# plugin-comments + react-ui-thread refactor

Date: 2026-06-05
Status: Approved — implementing

## Goal

Factor the document-comments feature out of `plugin-thread` into a new, self-contained
`plugin-comments`, and rewrite `@dxos/react-ui-thread` as a clean set of Radix-style
composite primitives so both comments and chat consume one presentational layer.

This realises the two long-standing TODOs in `ThreadPlugin.tsx`:

> `// TODO(wittjosiah): Rename to ChatPlugin.`
> `// TODO(wittjosiah): Enabling comments should likely be factored out of this plugin but depend on its capabilities.`

## Hard constraints

1. **No plugin → plugin dependencies.** `plugin-comments` MUST NOT import `@dxos/plugin-thread`,
   and `@dxos/react-ui-thread` MUST NOT import any plugin. Shared code lands in the UI layer
   (`react-ui-thread`) or in the already-shared schema package (`@dxos/types`).
2. **No casts to silence types** (per repo policy). Fix types at the source.
3. **Clean rewrite, not a shim.** Update every call site; leave no compatibility re-exports.

## Current coupling (baseline)

| Concern                                                                                                                                              | Today                      | Used by                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------ |
| `CommentsCompanion` container                                                                                                                        | plugin-thread              | comments surface only          |
| `CommentsPanel` / `CommentsThread`                                                                                                                   | plugin-thread `components` | comments                       |
| `markdown-extension` (`MarkdownCapabilities.ExtensionProvider`)                                                                                      | plugin-thread              | comments-in-editor             |
| `extensions/threads.ts`, `extensions/command.ts`                                                                                                     | plugin-thread              | comments (command also chat)   |
| `app-graph-builder` (`commentsCompanion` node + `commentToolbar` action)                                                                             | plugin-thread              | comments                       |
| `ThreadCapabilities.State` (`toolbar`/`drafts`/`current`), `ViewState`                                                                               | plugin-thread              | comments                       |
| comment ops: `create`, `add-message`, `delete`, `toggle-resolved`, `select`, `delete-message`, `restore`, `restore-message`, `create-proposals`      | plugin-thread              | comments                       |
| agent stack: `agent-runner`, `respond-to-thread`, `should-trigger-agent`, `thread-skill`, `AgentRunner`/`AgentIdentity` caps, `set-agent-config` | plugin-thread              | comment threads                |
| `MessagePanel` (ECHO message binding + block rendering + Surface tiles)                                                                              | plugin-thread `components` | **both** Chat + CommentsThread |
| `Chat`, `ChannelArticle`, `ChannelChat`, `ThreadContainer`                                                                                           | plugin-thread              | chat/channels                  |
| chat ops: `create-channel`, `append-channel-message`, `on-create-space`                                                                              | plugin-thread              | chat                           |
| `Message`, `Thread`, `AnchoredTo`, `Channel` schema                                                                                                  | `@dxos/types`              | both (already external)        |
| `Thread.*` / `Message.*` presentational primitives                                                                                                   | `react-ui-thread`          | both                           |

## Target architecture — three layers

```
@dxos/types ............ Message / Thread / AnchoredTo / Channel schema (shared, unchanged)
        │
@dxos/react-ui-thread .. pure UI: Message.* + Thread.* composites (radix), virtual stack
        │                     no app-framework; object tile injected via root context
   ┌────┴─────┐
plugin-thread   plugin-comments
  (chat)          (comments + agent)
```

Both plugins depend only on `react-ui-thread` + `@dxos/types` + framework — never on each other.

### Layer 1 — `@dxos/react-ui-thread` (UI)

Clean rewrite into two Radix-composite namespaces. Absorbs `MessagePanel`'s frame, ECHO
message binding, and block rendering; absorbs `extensions/command.ts`; absorbs the `Chat`
scroll/stack/textbox layout shape.

**New runtime deps:** `@dxos/react-ui`, `@dxos/react-ui-mosaic`, `@dxos/echo`, `@dxos/echo-react`,
`@dxos/types`, `@dxos/ui-theme` (echo currently dev-only).

**`Message.*`** — renders one `Message.Message` (ECHO object or Ref).

- `Message.Root` — avatar gutter + content subgrid (was `MessageRoot`).
- `Message.Heading` — author name + timestamp + actions slot (was `MessageHeading`).
- `Message.Body` — block loop: `text` (CodeMirror via `useTextEditor` + `command`), `proposal`,
  and object/`reference` blocks delegated to the injected `Object` tile.
- `Message.Textbox` — composer editor (was `MessageTextbox`).
- Editing / delete / accept-proposal exposed as callbacks, not internal operations.

**`Thread.*`** — renders an ordered list of messages + composer.

- `Thread.Root` — context provider; accepts `components={{ Object }}` (the only injected slot),
  `current`, members/identity context. Wraps `Mosaic.Container`.
- `Thread.Header` — optional name/detached affordance (was `ThreadHeader`).
- `Thread.Messages` — `MosaicVirtualStack` of `Message` tiles.
- `Thread.Textbox` — bottom/inline composer (`Message.Textbox` + send).
- `Thread.Status` — activity / hint line (was `ThreadStatus`).
- Orientation `inline` (comments) vs `pinned` (channel chat), replacing `Chat`'s two layouts.

**Object-tile injection.** A message `reference`/object block needs `Surface` (app-framework),
which cannot live in the UI package. `Thread.Root` takes `components.Object: FC<{ subject }>`
via context (default = titled-card fallback). Each plugin supplies a one-line `Surface` tile.

**Testing.** Delete `testing.tsx` (`MessageEntity`/`MessageStoryText`). Stories use the real
`@dxos/types` `Message` schema with sample data from `@dxos/schema/testing`:

```ts
import { random } from '@dxos/random';
import { type ValueGenerator, createGenerator } from '@dxos/schema/testing';
import { Message } from '@dxos/types';

const generator: ValueGenerator = random as any;
const messages = createGenerator(generator, Message.Message).createObjects(8);
```

### Layer 2 — `plugin-thread` (chat)

Stays; consumes the new `react-ui-thread`. Name/id kept (`org.dxos.plugin.thread`) — rename to
`plugin-chat` deferred to a follow-up. Retains: `ChannelArticle`, `ChannelChat`, `ThreadContainer`,
the `Chat` container (rebuilt on `Thread.*`), `create-channel`, `append-channel-message`,
`on-create-space`, `Channel` schema, channel/chat/thread surfaces, its `Object` `Surface` tile.
Removes everything comment- and agent-related (moves to `plugin-comments`).

### Layer 3 — `plugin-comments` (new)

Standard plugin skeleton (see composer-plugins skill). Depends on `react-ui-thread`, `@dxos/types`,
framework — zero plugin deps. Owns:

- **Containers:** `CommentsArticle` (was `CommentsCompanion`) + comment-thread list built on `Thread.*`.
- **Capabilities:** `markdown-extension` (`MarkdownCapabilities.ExtensionProvider`), `react-surface`
  (`comments` surface), `app-graph-builder` (companion node + comment toolbar action), `state`
  (`State`/`ViewState`), `operation-handler`, `undo-mappings`, `agent-runner`, `skill-definition`.
- **Extensions:** `threads.ts`, `command.ts` move here (command also re-exported by react-ui-thread;
  comments imports the UI one — no duplicate). NOTE: `command` lives in `react-ui-thread`; comments
  uses it from there. `threads.ts` stays in the plugin (needs ops/state).
- **Operations:** `create`, `add-message`, `delete`, `toggle-resolved`, `select`, `delete-message`,
  `restore`, `restore-message`, `create-proposals`, `respond-to-thread`, `set-agent-config`.
- **Agent:** `agent-runner`, `should-trigger-agent`, `thread-skill`, `AgentRunner`/`AgentIdentity`.
- **Types:** `ThreadCapabilities` (renamed `CommentsCapabilities`), `ThreadOperation` (comment subset,
  renamed `CommentsOperation`), `Settings`, `AgentIdentity`, view/state types. The `AgentConfig`/
  `AgentMode` schema currently extends `Thread.Thread` in `@dxos/types`; it stays in `@dxos/types`.

`on-create-space` stays with chat (it creates a default `General` channel).
`PLUGIN.mdl` for `plugin-comments` is the plugin's own spec (separate deliverable).

## Migration / sequencing

1. **react-ui-thread rewrite** (foundation): new `Message.*` + `Thread.*`, `command`, delete
   `testing.tsx`, schema-generator stories. Build + storybook green.
2. **plugin-comments skeleton** then move comment+agent code; rebuild containers on `Thread.*`;
   add `Object` Surface tile; stories with generated data. Build + lint + test + storybook.
3. **plugin-thread cleanup**: remove comment/agent code; rebuild `Chat`/containers on `Thread.*`;
   keep `Object` tile. Build + lint + test + storybook.
4. **composer-app wiring**: register `plugin-comments` in `plugin-defs.tsx`; verify undo-mapping
   history import (`app-framework/.../undo-mapping.ts`) and `plugin-sheet` `thread-ranges`
   integration still resolve (they consume `@dxos/types`, not comment internals — verify).
5. **Repo-wide**: `moon run :build`, `:lint --fix`, `:test`. Fix all fallout at the root.

## Testing strategy

- `react-ui-thread`: storybook variants for `Message` (text / proposal / object-tile / editing) and
  `Thread` (inline + pinned, with generated messages, activity, send). `test-storybook` headless.
- `plugin-comments`: port `should-trigger-agent.test.ts`; keep agent storybook variants
  (stub + live runner) from the current `CommentsCompanion.stories.tsx`; `CommentsArticle` story.
- `plugin-thread`: keep `ChannelArticle`/`ThreadContainer` stories; ensure chat send/scroll works.
- Derive `plugin-comments` acceptance from its `PLUGIN.mdl` `test` blocks.

## Out of scope

- Renaming `plugin-thread` → `plugin-chat` (follow-up).
- Moving `Message`/`Thread`/`AnchoredTo`/`Channel` schema out of `@dxos/types`.
- New comment/agent features beyond what exists today (straight port).
- Reworking `react-ui-chat` (assistant chat UI) — untouched.
