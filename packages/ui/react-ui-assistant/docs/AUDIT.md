# react-ui-assistant / react-ui-chat — component audit

Question: should these two packages be merged into a single Radix-style component set?

**Answer: no.** Merge the _namespace_, which already exists — in the wrong place
(`plugin-assistant`). See §8.

Companion docs: [`DESIGN.md`](./DESIGN.md) (this package's call stack),
[`plugin-assistant/docs/AUDIT.md`](../../../plugins/plugin-assistant/docs/AUDIT.md) (the
plugin-scoped structural audit this one complements — it splits by _role_, this one inventories
_components_).

---

## 1. Packages

|               | `@dxos/react-ui-chat`                                                                                                       | `@dxos/react-ui-assistant`                                                                                                                            | `@dxos/react-ui-feed`                                            |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Path          | `packages/ui/react-ui-chat`                                                                                                 | `packages/ui/react-ui-assistant`                                                                                                                      | `packages/ui/react-ui-feed`                                      |
| Description   | "Chat components."                                                                                                          | "Assistant chat thread on the virtualized feed."                                                                                                      | "Virtualized feed of message items."                             |
| Private       | no                                                                                                                          | no                                                                                                                                                    | no                                                               |
| Entries       | `.`, `./translations`                                                                                                       | `.`, `./testing`, `./translations`, `./types`                                                                                                         | `.`, `./testing`, `./debug`                                      |
| Message model | **none** — plain props only                                                                                                 | `Message.Message` end to end                                                                                                                          | `Message.Message`                                                |
| `@dxos` deps  | `async`, `invariant`, `react-ui`, `react-ui-components`, `react-ui-dnd`, `react-ui-editor`, `ui-editor`, `ui-theme`, `util` | `echo`, `keys`, `react-ui`, `react-ui-components`, **`react-ui-feed`**, `react-ui-syntax-highlighter`, `types`, `ui`, `ui-editor`, `ui-theme`, `util` | `react-ui`, `react-ui-virtual`, `types`, `ui-editor`, `ui-theme` |

Dependency direction: `react-ui-feed` ← `react-ui-assistant`. **`react-ui-chat` has no edge to
either.** No cycles.

`react-ui-assistant`'s `./types` entry exists so workerd can import `ChatView` without React
(`src/types.ts:5`) — evidence the team is splitting these concerns, not joining them.

## 2. `@dxos/react-ui-chat` — exported surface

Barrel: `src/index.ts:5` → `src/components/index.ts:5-8`.

| Export                      | File:line                                                       | Purpose                                                | Shape                                                  | Convention                                                                                                                            |
| --------------------------- | --------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `ChatDialog`                | `src/components/ChatDialog/ChatDialog.tsx:198`                  | Bottom-docked resizable/collapsible dialog shell       | namespace `Root`/`Header`/`Content`/`Footer`           | bespoke: no `forwardRef`, no `Slot`, no `tx()`; `mx()` + literal Tailwind. Props types **not exported**                               |
| `ChatEditor`                | `src/components/ChatEditor/ChatEditor.tsx:28`                   | CodeMirror prompt input, submit-on-Enter               | plain                                                  | `forwardRef<ChatEditorController>`, no `Slot`/`tx()`                                                                                  |
| `useChatExtensions`         | `src/components/ChatEditor/useChatExtensions.ts:26`             | Builds the CM extension stack                          | hook                                                   | split out for react-refresh                                                                                                           |
| `commands`, `matchCommands` | `src/components/ChatEditor/commands.ts:92`, `:21`               | `$`-instruction + leading-`/` slash-command completion | CM extension                                           | —                                                                                                                                     |
| `references`                | `src/components/ChatEditor/references.ts:55`                    | `@`-reference autocomplete + pill widget               | CM extension                                           | **`@deprecated`** (`:27`, `:52`) — superseded by the `reference` registry tag                                                         |
| `ChatStatus`                | `src/components/ChatStatus/ChatStatus.tsx:162`                  | Elapsed-time / status strip                            | namespace `Root`/`Icon`/`Stopwatch`/`Separator`/`Text` | `Root` = `forwardRef` + `useImperativeHandle`; sub-parts plain fns; no `tx()`. Props types exported                                   |
| `useChatStatusContext`      | `src/components/ChatStatus/ChatStatusContext.ts:21`             | `{ elapsed, running }`                                 | hook                                                   | —                                                                                                                                     |
| `formatElapsed`             | `src/components/ChatStatus/format.ts:14`                        | ms → `Ns` / `Nm Xs` / `Nh Xm`                          | util                                                   | see §5 duplication                                                                                                                    |
| `ChatStatusIndicator`       | `src/components/ChatStatusIndicator/ChatStatusIndicator.tsx:24` | Spinner + error tooltip for provider state             | plain                                                  | bespoke. **Deliberate leaf import** `@dxos/react-ui-components/Spinner` (`:8-11`) to keep `@dxos/ai` + tiktoken out of lean consumers |
| `translations`              | `src/translations.ts:7`                                         | **empty bundle** (`{}` at `:12`)                       | —                                                      | dead weight today                                                                                                                     |

Known defects: `Root.displayName = 'ChatChatStatus.Root'` and
`useChatStatusContext('ChatChatStatus.Stopwatch')` (`ChatStatus.tsx:86`, `:124`); hardcoded English
label at `ChatDialog.tsx:128`.

Stories: `ChatEditor`, `ChatStatus`, `ChatDialog`. None for `ChatStatusIndicator`.

## 3. `@dxos/react-ui-assistant` — exported surface

Barrel: `src/index.ts:5-9` → `./components`, `./registry`, `./renderer`, `./translations`, `./types`.

| Export                               | File:line                                            | Purpose                                                                                                                                                                                      | Shape                       | Convention                                                                                                                       |
| ------------------------------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `ChatThread`                         | `src/components/ChatThread/ChatThread.tsx:181`       | `MessageList.Root` preconfigured with the view-typed renderer, widget registry, chrome, sticky-bottom, tail reserve                                                                          | namespace `Root`/`Viewport` | bespoke config shell; no `forwardRef`/`Slot`/`tx()`; publishes via `controllerRef`, not a forwarded ref. Props exported (`:186`) |
| `ChatThreadController`               | `:46`                                                | alias of `MessageListController`                                                                                                                                                             | type                        | —                                                                                                                                |
| `MessageChrome`                      | `src/components/MessageChrome/MessageChrome.tsx:196` | Per-message frame: right-aligned prompt bubble vs full-width answer, hover toolbars                                                                                                          | plain (feed `Chrome` slot)  | props type **imported from** `react-ui-feed` (`:10`)                                                                             |
| `MessageChromeProvider`              | `:35`                                                | `onRewind`/`streaming`/`showContext`/`debug` context                                                                                                                                         | provider                    | defaults `{}` so a missing provider does not throw                                                                               |
| `PromptToolbar` / `AssistantToolbar` | `:93` / `:120`                                       | copy / rewind / time / id                                                                                                                                                                    | plain                       | —                                                                                                                                |
| `formatTime`                         | `src/components/MessageChrome/format-time.ts:28`     | relative → absolute timestamp                                                                                                                                                                | util                        | see §5; doc comment at `:5` is stale                                                                                             |
| `assistantRegistry`                  | `src/registry.tsx:34-153`                            | `XmlWidgetRegistry`: DOM tags `prompt`, `link-preview`, `synthetic`, `reasoning`, `status`, `reference`, `suggestion`, `select`, `stats`; React tags `toolkit`, `summary`, `surface`, `json` | data                        | host-extensible by spreading; `surface` is a `FallbackWidget` the plugin overrides                                               |
| `createRenderer`, `estimateRow`      | `src/renderer.ts:26`, `:188`                         | Message → markdown+XML projection filtered by `ChatView`; row-height estimator                                                                                                               | fns                         | streaming contract: pending blocks emitted **unclosed** (`:159-167`)                                                             |
| `ChatView`, `ChatThreadEvent`        | `src/types.ts:19`, `:31`                             | `normal`/`summary`/`thinking`/`debug`; `submit`/`rewind`                                                                                                                                     | Schema                      | —                                                                                                                                |
| `translations`                       | `src/translations.ts:7-29`                           | 13 real keys                                                                                                                                                                                 | —                           | —                                                                                                                                |
| widgets                              | `src/widgets/index.ts:5-13`                          | `FallbackWidget`, `ReasoningWidget`, `ReferenceWidget`, `SelectWidget`, `StatsWidget`, `StatusWidget`, `SuggestionWidget`, `SummaryWidget`, `ToolWidget`                                     | `XmlWidgetProps` components | reachable only via `assistantRegistry` — **not** in the root barrel                                                              |
| `./testing`                          | `src/testing/index.ts:5`                             | fixture generator                                                                                                                                                                            | —                           | —                                                                                                                                |

Stories: `ChatThread.stories.tsx` — end-to-end, depends on `react-ui-feed/testing` and `/debug`.

## 4. `@dxos/react-ui-feed` — the engine (context)

- `MessageList` — `src/components/MessageList/MessageList.tsx:803`, namespace
  `Root`/`Viewport`/`Item`/`Nav`. **The only one of the three that follows the composite
  convention**: `composable` + `composableProps` at `:561`, `:661`, `:730`. Also exports
  `MessageChromeProps:52`, `MessageRange:59`, `MessageListController:66`, `ScrollToOptions:112`,
  `useMessageList:124`.
- `Minimap` (`Minimap.tsx:38`), `Outline` (`Outline.tsx`, `OutlineMarker:35`) — plain fns, rail
  chrome.
- `Block` (`src/components/Block/index.ts:5-10`): `HtmlBlock` (DOMPurify), `MarkdownBlock`
  (per-message CodeMirror doc, typewriter streaming), `selection-group`, `highlight`,
  `widget-state`.
- Hooks: `useDecorations`, `useFeedNavigation`, `useItemSelection`.
- Model: `FeedModel` (`src/model/feed.ts:43`, extends `ListModel` from `react-ui-virtual`),
  `isPrompt:113`, `messageText`, `searchFeed`, `sliceFeed`, `chatRenderer:33`.
- Hardcoded English labels at `MessageList.tsx:761-788` despite `nav-*.label` keys existing in the
  assistant bundle.

## 5. Overlap

The two packages sit on **opposite sides of one chat**: `react-ui-chat` owns the composer / shell /
status; `react-ui-assistant` owns the thread. Genuine overlaps:

| Concern                                           | `react-ui-chat`                                       | `react-ui-assistant` / feed                                                                   | Verdict                                                                                                                                     |
| ------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Message → markdown+XML with unclosed pending tags | —                                                     | `react-ui-assistant/src/renderer.ts:26-167` vs `react-ui-feed/src/model/feed-model.ts:33-104` | **Real duplication** — two `blockToMarkdown` + two `tag()` with the same streaming contract. `chatRenderer` looks superseded, possibly dead |
| Time formatting                                   | `ChatStatus/format.ts:14` `formatElapsed` (durations) | `MessageChrome/format-time.ts:28` `formatTime` (relative)                                     | **Near-duplicate**; both hand-rolled, sibling packages                                                                                      |
| Streaming indicator                               | `ChatStatusIndicator.tsx:24`                          | `MessageChrome` `streaming` flag (`:29`, `:197`)                                              | Same underlying state, wired twice by the host                                                                                              |
| Toolbar                                           | —                                                     | `PromptToolbar`/`AssistantToolbar`, `MessageList.Nav`                                         | Plus a third in the plugin (`Chat.Toolbar`, `Chat.tsx:288`) — three unrelated "toolbars", no shared surface                                 |
| References                                        | `references.ts:55` (deprecated)                       | `assistantRegistry['reference']` + `ReferenceWidget`                                          | Two takes; one deprecated                                                                                                                   |

Unique to `react-ui-chat`: `ChatDialog`, `ChatEditor` + `useChatExtensions`, `commands`,
`references`, `ChatStatus`, `ChatStatusIndicator`.

Unique to `react-ui-assistant`: `ChatThread`, `MessageChrome` family, `assistantRegistry`,
`createRenderer`/`estimateRow`, `ChatView`/`ChatThreadEvent`, the 9 widgets, real translations,
`./testing`, `./types`.

Name collisions to resolve before any merge: **`ChatDialog`** (`react-ui-chat` vs
`plugin-assistant/src/containers/ChatDialog`), **`ChatStatus`** (`react-ui-chat` vs the plugin's
`ChatPrompt/ChatStatus.tsx`), **`ChatThread`** (package vs `Chat.Thread`), **`ChatPrompt`** (plugin
component vs `Chat.Prompt`), **`ReferenceWidget`** (`references.ts:162` class vs the assistant
widget).

## 6. Consumers

| Package                                |      chat       | assistant | feed |
| -------------------------------------- | :-------------: | :-------: | :--: |
| `plugin-assistant`                     |       yes       |    yes    | yes  |
| **`composer-crx`** (browser extension) |       yes       |     —     |  —   |
| `stories-assistant`                    | yes (type only) |     —     |  —   |
| `storybook-testing`                    |       yes       |     —     |  —   |

`packages/apps/composer-crx/src/components/Chat/Chat.tsx:13` imports `ChatEditor` +
`ChatStatusIndicator` and **nothing** from assistant/feed. This is the hard constraint: the
extension is exactly the "lean consumer" the leaf import at `ChatStatusIndicator.tsx:8-11` defends.
Merging would pull `@dxos/types`, `@dxos/echo`, `react-ui-feed`, `react-ui-virtual`, per-message
CodeMirror and dompurify into the extension bundle.

## 7. Blockers to a merge

1. **Data model.** Assistant is `Message.Message`-shaped end to end; chat is entirely plain props —
   no message concept anywhere.
2. **Bundle weight is a defended property** (§6). Non-negotiable, not merely preferable.
3. **Neither package follows the `composite-components` convention.** Both use `mx()` + literal
   Tailwind; neither uses `tx()` or `composable`/`Slot`. Only feed's `MessageList` does. A merge
   that also standardizes is two refactors, not one.
4. **Ref conventions differ three ways**: `forwardRef<Controller>` (`ChatEditor`), `forwardRef` +
   `useImperativeHandle` (`ChatStatus.Root`), `controllerRef` prop (`ChatThread.Root` /
   `MessageList.tsx:488`).
5. **Cycle risk** appears only if the merged package absorbs the plugin's `ChatPrompt`, which
   reaches `@dxos/assistant-toolkit`, `@dxos/compute/Project`, `@dxos/echo-react` and
   plugin-internal `#hooks`/`#types` aliases — app-framework territory that must not enter
   `packages/ui`.
6. **Translation namespaces.** Merging renames the assistant's 13 keys; every host registering them
   must change. Cheap today (chat's bundle is empty), not later.
7. **Vintage.** chat is 2025 with a deprecated export still in it; assistant/feed are 2026 and are
   the newer architecture (SPEC `F-*` references throughout `MessageList.tsx`, `feed.ts`).

## 8. Recommendation — three layers, not two packages

The namespace already exists at
`packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:660-669`:

```ts
Chat = { Root, Toolbar, Content, Prompt, Status, Thread, Outline, TaskList };
```

…assembled from `react-ui-assistant` (Thread), `react-ui-feed` (Outline), `react-ui-chat` (via
`ChatPrompt`), `react-ui-task`, `react-ui-menu`. The barrel header already records the intent:
`packages/plugins/plugin-assistant/src/components/index.ts:4` — _"TODO(wittjosiah): Factor
components out of plugin-assistant into a standalone package."_

- **`react-ui-feed`** stays the engine (virtualization, blocks, model, rails). Unchanged.
- **`react-ui-chat`** stays the ECHO-free, message-free primitives layer. Do not let `@dxos/types`
  in.
- **`react-ui-assistant`** grows into the composition layer that owns `Chat.*`.

Target surface in `@dxos/react-ui-assistant`:

| Part           | Source today                                                               |
| -------------- | -------------------------------------------------------------------------- |
| `Chat.Root`    | plugin `Chat.tsx:65` (context: model, event bus, controller, visibleRange) |
| `Chat.Toolbar` | plugin `Chat.tsx:288`                                                      |
| `Chat.Content` | plugin `Chat.tsx:314`                                                      |
| `Chat.Thread`  | `ChatThread.tsx:181` (`Root` + `Viewport`)                                 |
| `Chat.Outline` | plugin `Chat.tsx:540`                                                      |
| `Chat.Prompt`  | `react-ui-chat` `ChatEditor` + plugin `ChatPrompt` (presentational half)   |
| `Chat.Status`  | `react-ui-chat` `ChatStatus.tsx:162` (re-export)                           |
| `Chat.Dialog`  | `react-ui-chat` `ChatDialog.tsx:198` (re-export)                           |

Order of work:

1. **De-duplicate the renderer** — lowest risk, highest payoff. Delete `chatRenderer` + duplicate
   `blockToMarkdown`/`tag`/`escapeXml` from `feed-model.ts:33-106` if unused, or extract the shared
   `tag`/escape helpers so `renderer.ts:159-171` is the only streaming-tag encoder.
2. **Unify time formatting** — one of `formatElapsed` / `formatTime` moves to `@dxos/util` or
   `@dxos/react-ui`. Fix the `'ChatChatStatus.*'` typos and the stale `format-time.ts:5` comment
   while there.
3. **Move `Chat.Root`/`Toolbar`/`Content`/`Outline`/`Thread`** out of the plugin, splitting
   `Chat.tsx` at the seam where it touches `@dxos/app-framework` (`useOperationInvoker`, `:10`),
   `@dxos/assistant-toolkit` (`:11`), `AiChatProcessor`, `TaskSlashCommands`, `SurfaceWidget`. Those
   five stay in the plugin and are injected as props/context. `buildMarkers:359`, `promptTitle:333`,
   `replySnippet:340` are pure and move as-is.
4. **Move `Chat.Prompt`** — split `ChatPrompt.tsx` into presentational (moves) and wiring
   (`AiChatProcessor`, `AssistantPreset`, `#hooks`, `useChatVoiceInput` — stays). Without this,
   step 3 drags `@dxos/compute` into `packages/ui`.
5. **Re-export, don't relocate**, the chat primitives — `Chat.Prompt`/`Chat.Status`/`Chat.Dialog`
   compose from `@dxos/react-ui-chat`, preserving its light dependency set for `composer-crx`.
6. **Standardize on `composable` + `composableProps`** as each part moves, and move hardcoded
   labels (`ChatDialog.tsx:128`, `MessageList.tsx:761-788`) into translations. During the move, not
   as a separate pass.
7. **Namespace the translations** under one key when `Chat.*` lands.
8. **Delete the deprecated `references` extension** (`references.ts:27`, `:52`).
