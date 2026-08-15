# plugin-assistant — chat UI audit & restructuring proposal

Scope: what actually renders a chat (prompt + thread) inside `plugin-assistant`, which parts of it
depend on the plugin system and which do not, and how the reusable half should be pushed down into a
lower-level package that can be developed against a **mock processor** — no AI loop.

That question does not stop at `plugin-assistant`. **Five** scenarios in the repo render a thread of
messages, across four packages and three plugins:

| Scenario           | Owner                                   | Renderer family      | Storage                     |
| ------------------ | --------------------------------------- | -------------------- | --------------------------- |
| AI chat            | `plugin-assistant`                      | document (CodeMirror) | `Feed` (`Chat.feed`)        |
| human chat         | `react-ui-thread` (via `plugin-thread`) | tile (Mosaic)        | `Feed` (channel backend)    |
| comments           | `react-ui-thread` (via `plugin-review`) | tile (Mosaic)        | `Thread.messages: Ref[]`    |
| transcription      | `react-ui-transcription`                | document (CodeMirror) | `Feed` (`Transcript.feed`)  |
| email conversation | `plugin-inbox/ConversationStack`        | tile (Mosaic)        | ECHO query (mailbox)        |

§3 audits that tension; §4 proposes a split by **role** (composer / tile renderer / document
renderer) rather than by **speaker** (AI / human / email / machine).

Companion docs: [`DESIGN.md`](./DESIGN.md) (the end-to-end call stack and the test/story audit),
[`DEBUG.md`](../DEBUG.md) (AI → CodeMirror dataflow). This document does not repeat either; it is a
**structural** audit, where DESIGN.md is a **behavioural** one.

Measured on branch `claude/ai-chat-interface-restructure-bdc043`.

---

## 1. Why the plugin is hard to work in

`src/` is **20,204 lines**. The chat UI is a minority of it, but it is entangled with the rest:

| Area                                                                                 | LOC    | Role                                                              |
| ------------------------------------------------------------------------------------ | ------ | ----------------------------------------------------------------- |
| `components/`                                                                        | 6,396  | Chat composite, prompt, thread, widgets, task list, toolbox       |
| `execution-graph/`                                                                   | 3,510  | Trace → span tree (debug/trace panel only)                        |
| `containers/`                                                                        | 2,971  | Surface-mounted containers (11 lazy entries)                      |
| `capabilities/`                                                                      | 1,614  | 20+ plugin modules (AI service, agent runtime, graph, settings …) |
| `hooks/`                                                                             | 1,261  | 15 hooks — half UI, half plugin/capability plumbing               |
| `processor/`                                                                         | 1,020  | `AiChatProcessor` — the client-side request/stream state machine  |
| `operations/`, `types/`, `testing/`, `templates/`, `skills/`, `util/`, `extensions/` | ~2,600 | The rest                                                          |

The plugin registers **20 modules** ([`plugin.ts`](../src/plugin.ts)) and exports **12 subpaths**.
Three consequences for chat work:

1. There is no way to render a thread without the plugin's capability graph — the cheapest
   full-fidelity harness is a storybook that boots `AssistantPlugin` plus ~10 peer plugins
   (`stories-assistant`).
2. The two existing mid-level harnesses stop short: `ChatThread.stories.tsx` drives the syncer from
   a scripted feed but has no prompt/processor; `processor/streaming.node.test.ts` drives the
   processor but has no UI.
3. Chat UI changes and agent-loop changes land in the same package, so neither can be reviewed or
   versioned independently.

`components/index.ts` already carries the standing intent:

> `// TODO(wittjosiah): Factor components out of plugin-assistant into a standalone package.`

---

## 2. The Chat component tree

Runtime composition for the primary entry point, `ChatArticle`. Coupling tags:

- **[ui]** — depends only on `@dxos/react-ui*` / `@dxos/ui*` / CodeMirror.
- **[echo]** — additionally on `@dxos/echo`, `@dxos/types`, `@dxos/assistant`,
  `@dxos/assistant-toolkit` (data layer; no plugin system).
- **[plugin]** — depends on `@dxos/app-framework` / `@dxos/app-toolkit` capabilities, operations,
  surfaces, or another plugin.

```
ChatArticle                                        containers/ChatArticle          [plugin]
├── useChatServices                                hooks/                          [plugin] ProcessManagerRuntime capability
├── usePresets(settings)                           hooks/                          [plugin] Settings capability
├── useChatProcessor → AiChatProcessor             hooks/, processor/              [plugin] Capability layers + Effect
├── useSelectionContext(companionTo)               hooks/                          [plugin] plugin-attention
├── ClientOperation.OpenUsage (quota toast action) containers/ChatArticle          [plugin]
└── Chat.Root                                      components/Chat/Chat.tsx        [echo]
    ├── ChatContextProvider                        components/Chat/context.ts      [echo]
    ├── Event<ChatEvent> bus                       components/Chat/events.ts       [ui]
    ├── projectThread / resolveRewind              components/Chat/thread.ts       [echo] Feed lineage — soft fork
    ├── useQuery(feed, Filter.type(Message))       @dxos/echo-react                [echo]
    ├── processor.{messages,streaming,active,error} atoms                          [echo]
    └── (children)
        ├── Chat.Toolbar                           components/Chat/Chat.tsx        [plugin] useChatToolbarActions → Operation.invoke
        │   └── Menu.Root / Menu.Toolbar           @dxos/react-ui-menu             [ui]
        ├── Chat.Content                           components/Chat/Chat.tsx        [ui]
        ├── Chat.Minimap                           components/Chat/Chat.tsx        [ui]
        │   └── Minimap                            @dxos/react-ui-components       [ui]
        ├── Chat.Thread → ChatThread               components/ChatThread/          [echo]
        │   ├── MarkdownStream                     @dxos/react-ui-markdown         [ui]
        │   ├── MessageSyncer                      ChatThread/sync/sync.ts         [echo] monotonic-append contract
        │   │   └── applyToolBlockToWidgetState    ChatThread/sync/tool-widget-state.ts [echo]
        │   ├── createBlockRenderer / blockToMarkdown  ChatThread/registry.tsx      [echo] block → markdown+XML
        │   ├── componentRegistry (XmlWidgetRegistry) ChatThread/registry.tsx      [echo]
        │   └── widgets/                           ChatThread/widgets/
        │       ├── ReasoningWidget                DOM (CodeMirror)                [ui]
        │       ├── ReferenceWidget                DOM                             [ui]
        │       ├── SelectWidget                   DOM                             [ui]
        │       ├── StatsWidget                    DOM                             [ui]
        │       ├── StatusWidget                   DOM                             [ui]
        │       ├── SuggestionWidget               DOM                             [ui]
        │       ├── BranchWidget                   React (portaled)                [ui] soft-fork toolbar + rewind
        │       ├── SummaryWidget                  React                           [ui]
        │       ├── ToolWidget                     React                           [echo] @dxos/types ContentBlock
        │       ├── FallbackWidget                 React                           [ui]
        │       └── SurfaceWidget                  React                           [plugin] app-framework Surface + ChatSurface role
        ├── Chat.Status → ChatStatus               components/ChatPrompt/ChatStatus.tsx [echo]
        │   ├── ChatStatus (Root/Elapsed)          @dxos/react-ui-chat             [ui]
        │   └── Matrix                             @dxos/react-ui-components       [ui]
        ├── Chat.TaskList → TaskList               components/TaskList/            [echo] Outline
        └── Chat.Prompt → ChatPrompt               components/ChatPrompt/          [echo]
            ├── ChatEditor (+ commands, pendingText)  @dxos/react-ui-chat, @dxos/ui-editor [ui]
            ├── ChatStatusIndicator                @dxos/react-ui-chat             [ui]
            ├── ChatMcpErrors                      ChatPrompt/                     [echo] processor.mcpErrors atom
            ├── ChatOptions                        ChatPrompt/ (415 LOC)           [echo]
            │   ├── useSkills / useActiveSkills / useSkillHandlers  hooks/useSkillRegistry.ts [echo]
            │   ├── useFilteredTypes               hooks/                          [echo]
            │   ├── useContextObjects              hooks/                          [echo] AiContext.Binder
            │   └── SearchList / Tabs / List       @dxos/react-ui-*                [ui]
            ├── ChatReferences                     ChatPrompt/                     [echo] useContextObjects
            ├── ChatPresets                        ChatPrompt/                     [ui] + AssistantPreset type
            ├── ChatActions                        ChatPrompt/ (241 LOC)           [plugin] transcription capabilities
            └── useChatVoiceInput                  ChatPrompt/                     [plugin] plugin-transcription + react-ui-transcription
```

Other consumers of the same composite:

| Consumer                               | Uses                                                       |
| -------------------------------------- | ---------------------------------------------------------- |
| `containers/ChatDialog`                | `Chat.Root → {Thread, Prompt}`                             |
| `containers/ChatCompanion`             | wraps `ChatArticle` (adds skills + companion wiring)       |
| `containers/SpaceHomePrompt`           | **`ChatPrompt` alone**, no `Chat.Root`                     |
| `stories-assistant/modules/ChatModule` | `Chat.Root → {Toolbar, Content, Thread, TaskList, Prompt}` |

Four different assemblies of the same parts is evidence the composite API is already the right
shape. `SpaceHomePrompt` is the informative case: it uses `ChatPrompt` with `processor` / `event` /
`db` / `chat` passed explicitly, which is why `ChatPrompt` has a props-based API and `Chat.Prompt`
is only a thin context adapter over it. The prompt is _already_ decoupled from the composite.

### 2.1 Size of the candidate surface

Excluding `*.stories.tsx` / `*.test.ts`:

| Subtree                         | src LOC   | tests/stories LOC | Verdict                                    |
| ------------------------------- | --------- | ----------------- | ------------------------------------------ |
| `components/Chat`               | 821       | 231               | movable behind a processor port            |
| `components/ChatPrompt`         | 1,215     | 137               | movable except `ChatActions` + voice input |
| `components/ChatThread`         | 499       | 604               | movable                                    |
| `components/ChatThread/widgets` | 767       | 261               | movable except `SurfaceWidget`             |
| `components/ChatThread/sync`    | 296       | 451               | movable as-is                              |
| `components/TaskList`           | 72        | 58                | movable as-is                              |
| **Total**                       | **3,670** | **1,742**         | ~**3,100 LOC** carry no plugin dependency  |

### 2.2 The five coupling points

Everything else is mechanical. These five are the actual design work:

| #   | Coupling                                                                     | Where                                   | Nature                                  |
| --- | ---------------------------------------------------------------------------- | --------------------------------------- | --------------------------------------- |
| 1   | `AiChatProcessor` — a concrete class built from Effect layers + capabilities | `Chat.Root`, `ChatPrompt`, `ChatStatus` | needs an interface (port)               |
| 2   | `SurfaceWidget` → `Surface` + `ChatSurface` role                             | `ChatThread/widgets/SurfaceWidget.tsx`  | needs a widget-registry extension point |
| 3   | `ChatActions` + `useChatVoiceInput` → plugin-transcription capabilities      | `ChatPrompt/`                           | needs a slot (children/render prop)     |
| 4   | `useChatToolbarActions` → `Operation.invoke`                                 | `Chat.Toolbar`                          | stays in the plugin                     |
| 5   | `meta.profile.key` translation namespace (`#meta`)                           | ~12 files                               | needs the package's own namespace       |

**Point 1 splits into two tiers, and the split decides the phasing.** Consumers read:

| Tier                | Members                                                            | Consumers                                | Types pulled in            |
| ------------------- | ------------------------------------------------------------------ | ---------------------------------------- | -------------------------- |
| **A — loop**        | `messages`, `streaming`, `active`, `error`, `mcpErrors` atoms; `request` / `retry` / `cancel` | `Chat.Root`, `ChatPrompt`, `ChatStatus`, `ChatMcpErrors` | `Message.Message`, `Error` |
| **B — AI context**  | `context` (`AiContext.Binder`), `registry` (`Registry.Registry`), `system`, `conversation` | `ChatOptions`, `ChatReferences` only     | `@dxos/assistant`          |

Tier A is what the mock has to fake, and it needs nothing beyond `@dxos/types`. Tier B is only read
by the two context/skill chip components inside the prompt. **Deferring tier B keeps `AiContext` out
of the lower package entirely** — `ChatOptions` and `ChatReferences` stay in `plugin-assistant` and
are injected into `ChatPrompt` through the same slot that carries `ChatActions`. The port then has
no `@dxos/assistant` surface at all.

---

## 3. Five thread scenarios, four packages, one missing engine

The existing packages are split by **who is talking** (AI / human / email / machine) rather than by
**what the component is** (composer vs renderer). That is the wrong axis, and it is why the same two
aspects are implemented repeatedly.

```
@dxos/react-ui-chat            ChatEditor · ChatDialog · ChatStatus · ChatStatusIndicator
   "the AI one"                deps: react-ui, react-ui-components, react-ui-dnd,
                                     react-ui-editor, ui-editor, ui-theme, async, util
                               consumers: plugin-assistant, composer-crx, stories-assistant

@dxos/react-ui-thread          Thread.{Root,Content,Header,Messages} ·
   "the human one" (1,673)     Message.{Root,Tile,Group,Body,Textbox,Heading,Time} ·
                               command · ThreadContextValue
                               deps: echo, types, react-ui-editor, react-ui-mosaic,
                                     react-ui-dnd, ui-editor, util, date-fns
                               consumers: plugin-thread (chat), plugin-review (comments)

@dxos/react-ui-transcription   Transcription · transcription-extension ·
   "the machine one" (505)     TranscriptModel<T> · useFeedModelAdapter
                               deps: react-ui-editor, ui-editor, types, async
                               consumers: plugin-transcription, plugin-assistant (voice)

plugin-inbox/ConversationStack ConversationStack.{Root,Content,MessageTile,SummaryTile,
   "the email one" (1,463)       MessageBody,MessageDetails,MessageMenu,MessageStar} ·
                               MarkdownViewer — in-plugin, not a package
                               deps: echo, types, react-ui-mosaic, react-ui-card,
                                     react-ui-menu, markdown, app-framework

plugin-assistant/ChatThread    ChatThread · MessageSyncer · registry · widgets
   "the chat one" (1,562)      in-plugin, not a package
```

### 3.0 The five use cases, by aspect

**(a) User input**

| Use case           | Component chain                                                     | Editor base                       | Packages                                                                 |
| ------------------ | -------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------ |
| AI chat            | `Chat.Prompt` → `ChatPrompt` → **`ChatEditor`**                       | `Editor.Root` / `Editor.View`     | `plugin-assistant` → `react-ui-chat` → `react-ui-editor`, `ui-editor`     |
| human chat         | `MessageThread` → `Thread.Textbox` → **`Message.Textbox`**            | `useTextEditor`                   | `plugin-thread` → `react-ui-thread` → `react-ui-editor`, `ui-editor`      |
| comments           | `CommentThread` → `Thread.Textbox` → **`Message.Textbox`**            | `useTextEditor`                   | `plugin-review` → `react-ui-thread` → `react-ui-editor`, `ui-editor`      |
| transcription      | **none — audio**: `useAudioTrack` → `useTranscriber` → `MediaStreamRecorder` | n/a                        | `plugin-transcription` → `react-ui-transcription`                         |
| email conversation | `ConversationStack` → `EditMessage` → **inbox-local `Editor`** (72 LOC) | `useTextEditor`                 | `plugin-inbox` (own component) → `react-ui-editor`, `ui-editor`           |

**Three text composers over one editor core** (`ChatEditor`, `Message.Textbox`, inbox `Editor`), each
with its own submit convention and controller, plus one audio path. Extension packs are split
arbitrarily across them: `$sentinel` completion + `references` + `pendingText` live with the AI one,
`/slash` + `@mention` highlighting with the human one, neither available to the third. The one piece
of genuine reuse already crossing the boundary is the audio path — `plugin-assistant`'s
`useChatVoiceInput` drives `react-ui-transcription`'s capture into the chat composer.

**(b) Thread / stack of messages**

| Use case           | Render mechanism                                                                | Family | Virtualized | Body dispatch                                | Packages                                                                 |
| ------------------ | --------------------------------------------------------------------------------- | ------ | ----------- | -------------------------------------------- | ------------------------------------------------------------------------ |
| AI chat            | `ChatThread` → `MessageSyncer` → **`MarkdownStream`** (one CodeMirror doc, typewriter) | D | CM viewport | `componentRegistry` (`XmlWidgetRegistry`, 11 tags) | `plugin-assistant` → `react-ui-markdown`, `ui-editor`                     |
| human chat         | `Thread.Messages` → **`Mosaic.VirtualStack`** → `Message.Group` / `Message.Tile`  | T      | ✅ TanStack  | `Message.Body` if-chain (4 block types)      | `plugin-thread` → `react-ui-thread` → `react-ui-mosaic`                   |
| comments           | `CommentsArticle` → many small `CommentThread` → same `Thread.*` primitives       | T      | ✅ (per thread) | same if-chain                             | `plugin-review` → `react-ui-thread` → `react-ui-mosaic`                   |
| transcription      | `Transcription` → `TranscriptModel<T>` → **`useTextEditor`** (one CodeMirror doc) | D      | CM viewport | `ChunkRenderer` + `xmlTags` (link-preview)   | `plugin-transcription` → `react-ui-transcription` → `react-ui-editor`     |
| email conversation | `ConversationStack.Content` → **`Mosaic.Stack`** → `MessageTile` → `MarkdownViewer` / `Html` | T | ❌ **none** | mimeType switch (`text/html` vs markdown) | `plugin-inbox` (own component) → `react-ui-mosaic`, `react-ui-editor`     |

Storage under all five: `Feed` for AI chat (`Chat.feed`), human chat (channel backend) and
transcription (`Transcript.feed`); `Thread.messages: Ref<Message>[]` for comments; an ECHO query for
email. Every one of them is a list of `Message.Message` from `@dxos/types`.

### 3.1 Aspect 1 — the composer (duplicated; should be unified)

|            | `react-ui-chat` `ChatEditor`                                      | `react-ui-thread` `Message.Textbox`            | `plugin-inbox` `Editor` (72 LOC)     |
| ---------- | ------------------------------------------------------------------ | ---------------------------------------------- | ------------------------------------ |
| Base       | `Editor.Root` / `Editor.View`                                      | `useTextEditor`                                | `useTextEditor`                      |
| Controller | `ChatEditorController` (`getText` / `setText` / `focus` / `view`)  | `MessageTextboxHandle` (`focus` only)          | none (uncontrolled)                  |
| Submit     | `SubmitOptions.onSubmit(text) => boolean`                          | `keyBindings({ onSend, onClear })`             | caller-supplied keymap               |
| Chrome     | none (bare editor)                                                 | wrapped in `MessageRoot` (avatar rail)         | none                                 |
| Token pack | `commands` — `$sentinel` autocomplete                              | `command` — `/slash` + `@mention` highlighting | —                                    |
| Extras     | `references` (dxn pills), `pendingText` (voice streaming)          | —                                              | —                                    |

Three CodeMirror composers with three submit conventions and three controller contracts, and the
divergence is accidental: **nothing about `/slash` + `@mention` is human-only, nothing about
`$sentinel` completion is AI-only, and nothing about either is email-hostile.** `ChatEditor` is the
better base — it already separates the editor from its chrome and exposes a fuller controller. The
token packs are just extensions and should all be importable regardless of who is typing.

**Unify:** `Message.Textbox` and inbox's `Editor` become `ChatEditor` + their own chrome; `command`
(slash/mention) moves next to `commands` (sentinel) as a peer extension. Contained: three consumers
(plugin-thread, plugin-review, plugin-inbox), no AI involvement, worth doing on its own merits
independent of everything else in this document.

### 3.2 Aspect 2 — the thread (five scenarios, two families, one model)

All five render the **same model**: `Message.Message[]` from `@dxos/types`. Four of the five store it
in a `Feed` (`Chat.feed`, channel backend, `Transcript.feed`); comments use `Thread.messages:
Ref<Message>[]`; email queries the mailbox. The model is not the problem. The **renderers** are, and
they fall into two families:

**Family D — document.** One CodeMirror document, messages rendered to markdown lines and synced
incrementally.

| | AI chat — `plugin-assistant/ChatThread` | transcription — `react-ui-transcription` |
| --- | --- | --- |
| LOC | 499 + 296 sync + 767 widgets | 67 + 203 ext + 229 model |
| Sync engine | `MessageSyncer` — block-level, append-only, monotonic-extension contract, per-message spans, widget-state side-channel | `TranscriptModel<T extends Chunk>` — **generic** over chunk type, append/update/delete, line-count map, abstracted `ChunkDocument` |
| Feed → model | `useQuery(feed)` + processor atoms, merged in `Chat.Root` | `useFeedModelAdapter(renderer, useQuery(feed))` |
| Widgets | `xmlTags` + `XmlWidgetRegistry` (11 tags) | `xmlTags` + `XmlWidgetRegistry` (link-preview) |
| Chrome | inside the document — `<prompt>` decoration, `<branch>` toolbar tag | CodeMirror gutter (`TimestampMarker`) |

**Family T — tile.** A React component per message in a stack.

| | human chat — `react-ui-thread` | comments — `plugin-review` | email — `plugin-inbox` |
| --- | --- | --- | --- |
| LOC | 1,673 (shared with comments) | 235 + 565 containers | 1,063 + ~400 |
| Stack | `Mosaic.VirtualStack` (**virtualized**) | reuses `Thread.*` | `Mosaic.Stack` (**not** virtualized) |
| Body | `Message.Body` if-chain — text, proposal, change, reference | same | mimeType switch — `text/html` → `Html`, else `MarkdownViewer` |
| Chrome | avatar rail, heading, time, grouping, dividers | thread frame, resolve/accept controls, anchoring | avatar, heading, star, details, `Menu`, inline draft composer |
| Host injection | `MessageMetadata` / `ObjectTileComponent` / `MessageCallbacks` | same contracts | own context + injected toolbar/actions |

Findings:

1. **`react-ui-thread` already generalises across two scenarios** (chat + comments) via one set of
   injection contracts. That is the proof the tile family can be shared — and the reason
   `ConversationStack` reads as the outlier rather than as a legitimate third variant.
2. **`TranscriptModel` is the better-factored member of family D.** It is generic over chunk type,
   abstracts the document behind a `ChunkDocument` interface, and supports update/delete — where
   `MessageSyncer` is hard-wired to `Message`/`ContentBlock`, append-only, and to
   `MarkdownStreamController`. Any shared engine should start from `TranscriptModel`'s shape, not
   `MessageSyncer`'s.
3. **Body dispatch should be one registry, N back-ends.** Today: one registry (AI), one if-chain
   that would silently drop nine AI block types (thread/comments), one mimeType switch (email), and
   one chunk renderer (transcription). A shared _block-renderer contract_ is the unification step,
   and it is small and unit-testable.
4. **Chrome-inside-the-document is family D's wart.** The AI thread injects a `<branch messageId=…/>`
   XML tag into the generated markdown so it can render a per-message toolbar, and portals React out
   of CodeMirror to do it. Transcription puts its timestamps in a gutter. Both are working around
   the same missing thing: **per-message chrome outside the document**.
5. **Neither family dominates.** Family D gives shared markdown/widget rendering, continuous
   selection, and cheap streaming; family T gives per-message chrome, editing, and virtualization.
   §3.3 is the way out.
6. **`@dxos/echo` in `react-ui-chat` is not the constraint.** `react-ui-thread` and
   `react-ui-transcription` both depend on `echo`/`types`; so does `react-ui-markdown`. The
   dependency worth holding the line on is `@dxos/assistant` (`AiContext`) — AI-loop machinery, not
   chat UI.

### 3.3 The way out: one engine — a virtualized list of markdown islands

The target architecture: **a virtualized list where each message is its own CodeMirror markdown
document ("island"), with React chrome around it.** One engine, owned by us, replacing both families.

```
MessageList  (the engine)
├── model        readonly Message[]  +  renderMessage(message) => markdown
├── virtualizer  dynamic measurement + height cache; we own scroll anchoring
├── island       one CodeMirror view per visible message (pooled/recycled)
│                extensions: markdown decoration · xmlTags(registry) · optional tail-append
│                escape hatch: an island may be arbitrary React (email HTML, custom tiles)
└── chrome       render-prop per message — avatar, heading, time, menu, star, branch toolbar
```

Each of the five scenarios then differs only in `registry` + `chrome` + `renderMessage`.

**What it buys**

1. **One rendering path.** Comments and email inherit markdown decoration and the widget registry;
   the AI thread keeps its widgets; transcription keeps its inline previews.
2. **Chrome stops being a hack.** `<branch>`-as-an-XML-tag and the timestamp gutter both become
   ordinary React around the island — finding 4 above, resolved structurally.
3. **Streaming gets simpler, not harder.** The streaming message is the tail island; the
   monotonic-append contract becomes per-island and `MessageSyncer`'s global cursor, line accounting
   and `MessageSpan` bookkeeping largely collapse.
4. **Virtualization for everyone.** Email conversations get it (they have none today); long channels
   and long chats stop paying for off-screen messages.
5. **Per-message editability** (comments, email drafts, message edit-in-place) is native to the
   island model, where it is awkward in a single shared document.

**What it costs — the parts that must be spiked before committing**

1. **N `EditorView`s.** One per visible message plus overscan (`Mosaic.VirtualStack` defaults to 8).
   Needs view pooling/recycling and minimal read-only extension sets. Measure before believing.
2. **Dynamic measurement vs CodeMirror's async layout.** The virtualizer needs heights; CodeMirror
   measures in its own phase, so an island that reflows after mount resizes underneath the
   virtualizer. This is the hard part and the most likely source of scroll jumps. Prototype three
   cases: mid-list growth, tail growth during streaming, and restore-scroll-on-remount.
3. **Selection across messages is lost.** Native selection cannot span separate CodeMirror
   instances, so "select the conversation and copy" needs an explicit affordance. This is the one
   real UX regression versus family D and should be an accepted, stated tradeoff.
4. **Cross-thread find.** CodeMirror search is per-view; thread-wide search becomes a custom pass
   over the model plus scroll-to-island.
5. **Minimap coordinates change** from document offsets to (island, offset); `buildMarkers` and
   `MessageSpan` need rework.

**What already exists to build on**

- `Mosaic.VirtualStack` — TanStack `useVirtualizer` with `measureElement` dynamic measurement,
  overscan, drag placeholders and pagination. The virtualization substrate is in place.
- `react-ui-masonry`'s height cache — the precedent for cheap remounts (`cacheKey`-scoped).
- `TranscriptModel` — the model/renderer/diff shape, minus the single-document assumption.
- `ConversationStack`'s tail-growth scroll re-pinning (ResizeObserver + settle window) — a working
  answer to cost 2 in the append case.

**Verdict: right target, spike first.** It is a better destination than "two renderers over one
model" (§4.2 option 1's assumption), because it collapses the families instead of blessing them. But
costs 2 and 3 decide whether it works, and neither is knowable from reading code. The spike is small
— a virtualized list of ~200 markdown islands with one streaming tail — and it gates everything in
§4 that touches the renderer. Nothing in the port/mock work (§4.3 track A steps 1–2, 4–5) depends on
the outcome, so the spike can run in parallel.

---

## 4. Proposal — split by role, not by speaker

The target is a package where the **chat / thread / tree loop can be developed against a mock
processor**, consumed from `plugin-assistant`. Getting there also resolves §3's tension, provided
the packages are re-cut along *what the component is* rather than *who is talking*.

```
plugin-assistant · plugin-thread · plugin-review · plugin-inbox · plugin-transcription
       each supplies: registry extensions · per-message chrome · host callbacks
    ↓
@dxos/react-ui-assistant     Chat.Root/Content/Prompt/Minimap/Status/TaskList
   (new)                     Chat.Thread = MessageList + AI registry + AI chrome
                             projectThread / resolveRewind (Feed lineage) + thread-tree UI
                             ChatProcessor port + MockChatProcessor (scripted, no AI)
                             ✗ NO @dxos/assistant (no AiContext) in phase 1
    ↓
@dxos/react-ui-chat          THE COMPOSER + THE ENGINE + shared contracts:
   (widened)                 ChatEditor (one composer) · extension packs ($sentinel, /slash,
                               @mention, references, pendingText) · ChatDialog · ChatStatus
                             MessageList (§3.3) — virtualized islands, chrome render-prop
                             MessageMetadata / MessageCallbacks / block-renderer contract
                             deps: react-ui-editor, ui-editor, react-ui-mosaic, echo, types
    ↑                              ↑                              ↑
react-ui-thread            plugin-inbox                  react-ui-transcription
  chat + comments chrome     email chrome + HTML island     timestamp chrome + chunk renderer
```

Five renderers become **one engine plus five chrome/registry configurations**, over one composer and
one message model. `react-ui-thread` keeps its scenario-specific chrome and contracts; what it stops
owning is the stack mechanics.

### 4.1 What moves, what stays

**Moves into `@dxos/react-ui-assistant`** (~2,300 LOC src + its tests/stories):

- `components/Chat/*` — Root, Content, Minimap, TaskList wrapper, context, events,
  `thread.ts` + `thread.test.ts` (Feed lineage)
- `components/ChatThread/*` — ChatThread, `sync/`, `registry.tsx`, all widgets except `SurfaceWidget`
- `components/ChatPrompt/ChatPrompt.tsx`, `ChatStatus.tsx`, `ChatMcpErrors.tsx`, `ChatPresets.tsx`
- `components/TaskList`
- `hooks/useChatKeymap`, `useDebug`
- `types/Assistant.ts` (the `ChatView` enum), the prop types from `types/AssistantPreset.ts`

**Stays in `plugin-assistant`** (injected into the components above):

- `capabilities/`, `operations/`, `containers/`, `skills/`, `templates/`, `execution-graph/`
- `processor/` — `AiChatProcessor` becomes the production implementation of the port
- `SurfaceWidget` (widget-registry extension), `ChatActions` + `useChatVoiceInput` (prompt slot)
- **`ChatOptions` + `ChatReferences`** and their hooks (`useSkillRegistry`, `useContextObjects`,
  `useContextBinder`, `useFilteredTypes`, `useReferencesProvider`) — these are the only tier-B
  (`AiContext`) consumers; keeping them behind the boundary is what makes the new package
  `@dxos/assistant`-free
- `Chat.Toolbar`, `hooks/useChatProcessor`, `useChatServices`, `useSelectionContext`, `usePresets`,
  `useChatToolbarActions`, `useHomeSuggestions`, `useProcessEphemeralStatus`, `useTraceMessages`

**Moves into `@dxos/react-ui-chat`** (the composer + engine consolidation):

- `react-ui-thread`'s `command` extension (slash/mention) as a peer of `commands` (sentinel)
- `MessageMetadata` / `MessageCallbacks` / the block-renderer contract — shared vocabulary every
  renderer imports
- `MessageList` — the new engine (§3.3), seeded from `TranscriptModel`'s model/renderer/diff shape
  and `Mosaic.VirtualStack`'s virtualizer, replacing `MessageSyncer` and the two tile stacks

The `ChatPrompt` prop surface grows one slot (`actions?: ReactNode` or a render prop) that carries
`ChatOptions`, `ChatReferences` and `ChatActions` in from the plugin. `SpaceHomePrompt` already
passes the prompt everything explicitly, so it is the natural first caller to prove the slot.

### 4.2 Is this a good idea?

**Yes — with the scope above, and on the condition that the processor port is designed first.**

Arguments for:

1. **The seam already exists in the code.** ~85% of the candidate surface has zero plugin imports
   today; four consumers already assemble `Chat.*` differently; and `SpaceHomePrompt` already uses
   `ChatPrompt` outside the composite entirely. This is recognising an existing boundary, not
   inventing one.
2. **It creates the missing harness tier.** With a `MockChatProcessor` (atoms fed from a scripted
   message list), the whole chat UI — prompt, thread, syncer, widgets, minimap, task list —
   renders with no ECHO space, no capabilities, no model, no `ScriptedLanguageModel`. Today the
   cheapest full-composite story boots ~10 plugins. DESIGN.md §2.5 names this exact gap: _"every
   UI-level iteration on chat behavior costs a live model round-trip"_. The scripted-model work
   (DESIGN.md §3.1) fixed determinism; it did not fix **cost of setup**.
3. **It is a precondition for the thread-tree work, not a detour.** The soft-fork model already sits
   at the right layer — `Feed.history` / `Feed.setParent` / `PARENT_KEY` in `@dxos/echo`, and
   `projectThread` / `resolveRewind` (87 LOC, pure, Feed-only) in `components/Chat/thread.ts`. A
   tree-of-threads UI is a projection over Feed lineage plus, later, over multiple Feeds. Building
   it inside a 20k-line plugin whose composite is welded to one processor instance is the harder
   path; building it against a Feed-shaped, processor-free package is the easier one. Multi-Feed
   spanning in particular wants a component that takes _feeds_, not a _chat with a processor_.
4. **It is also the fix for the three-way duplication.** Cutting by role forces the question "which
   package owns the composer / the tile / the stream", which is the question §3 shows nobody has
   answered — ~2,700 LOC of tile renderer exists twice because there was nowhere shared to put it.
5. **Independent review and versioning.** Chat UI churn stops colliding with agent-loop churn.

Arguments against / real costs:

1. **The port is genuine design work, and it is the risky part** — though deferring tier B (§2.2)
   shrinks it a long way: atoms + `request`/`retry`/`cancel`, nothing from `@dxos/assistant`. Done
   lazily it still becomes a widened signature — which the repo's no-cast rule forbids — so budget
   it as its own step with its own tests.
2. **Two slots must be introduced.** `componentRegistry` is currently a `const` value; it becomes
   `createComponentRegistry({ extensions })` so the plugin can contribute `SurfaceWidget`. `ChatPrompt`
   needs an actions slot carrying `ChatOptions` / `ChatReferences` / `ChatActions`. Slot indirection
   is where regressions hide — both need a story that renders _without_ the extension and one _with_
   it.
3. **Translations split.** ~12 files use `meta.profile.key`. The package needs its own namespace and
   the plugin must register it (`react-ui-chat` and `react-ui-thread` both already do this, so the
   pattern is established, but every key moves once).
4. **Package overhead.** New moon project, storybook config, build/test targets, and `private: true`
   until a trusted publisher exists.
5. **Story migration is not free.** ~1,700 LOC of tests/stories move; the `ChatThread` and
   `MarkdownStream` stories depend on `#testing` (`test-generator.ts`) which itself uses
   `plugin-client/testing` and `plugin-testing` — those story harnesses either stay in the plugin or
   the generator is split into a plugin-free half.

**Packaging alternatives considered:**

1. **Recommended — three packages by role** (§4's diagram): composer + contracts in
   `react-ui-chat`, tile renderer in `react-ui-thread`, streaming renderer + AI shell + mock in
   `react-ui-assistant`. Delivers the mock-processor loop soonest, unifies the composer immediately,
   and leaves the tile/stream convergence as an incremental follow-on.
2. **Two packages** — fold everything chat-shaped into `react-ui-chat` and keep `react-ui-thread` as
   the tile renderer. Fewer packages, but `react-ui-chat` then holds AI widgets (tool, reasoning,
   status) alongside the human composer, which is the same speaker-vs-role confusion in a new place.
3. **One package** — dissolve `react-ui-thread` into a single `react-ui-chat` holding both renderers
   and the assistant shell. Cleanest endpoint, largest blast radius (plugin-thread, plugin-review,
   plugin-inbox, plugin-assistant all move at once), and it blocks the tree work behind a renderer
   convergence that is still an open question. Reasonable as the *destination* after (1) proves the
   contracts.
4. **Reorganise in place (subpath exports only).** Cheapest, but buys nothing structural: the chat
   UI still cannot be rendered without the plugin's capability graph, which is the actual complaint.
5. **Do nothing until the thread-tree design settles.** Defensible, but the tree work will double the
   size of `components/Chat`, and moving 6k LOC is strictly harder than moving 3.6k.

### 4.3 Suggested sequencing

Three tracks. **Track 0 is the gate** — it decides whether track C is possible at all, and it blocks
nothing else. Tracks A and B are independent of its outcome and can start immediately.

**Track 0 — the engine spike (do this first, in a storybook, throwaway code)**

0. Build a virtualized list of ~200 markdown islands with one streaming tail and answer, with
   numbers: (a) cost of N `EditorView`s with and without pooling; (b) whether dynamic measurement
   survives mid-list growth, tail growth during streaming, and restore-scroll-on-remount without
   jumps; (c) what selection/copy across islands should do. _Deliverable: a story plus a paragraph of
   findings appended to §3.3._

**Track A — the mock-processor loop (the immediate goal)**

1. **Design the `ChatProcessor` port** in the plugin (no move yet): an interface + `AiChatProcessor
   implements ChatProcessor` + a `MockChatProcessor` in `#testing` driving the atoms from a scripted
   message list. Prove it by rewriting `Chat/Error.stories.tsx` against the mock. _Test: existing
   plugin tests + the rewritten story._
2. **Extract the prompt's actions slot**, moving `ChatOptions` / `ChatReferences` / `ChatActions`
   from `ChatPrompt`'s body to a prop. This is what keeps `AiContext` out of the new package, and it
   is verifiable in place before anything moves. _Test: `ChatOptions.stories.tsx`, `SpaceHomePrompt`._
3. **Move the leaf-most subtree as-is**: `ChatThread` + `sync/` + `registry.tsx` + widgets (minus
   `SurfaceWidget`), with `createComponentRegistry({ extensions })`. A directory move plus an
   extension point — deliberately *not* a rewrite, since track C may replace the syncer's internals
   later; the move is cheap either way and the registry survives both outcomes. Its stories and its
   451 LOC of sync tests move with it. _Test: `sync.test.ts`, `tool-widget-state.test.ts`, widget
   stories, `MarkdownStream.stories.tsx`._
4. **Move `Chat` + `ChatPrompt` + `TaskList`** onto the port and the slot. _Test: `thread.test.ts`
   plus a new composite story driven only by `MockChatProcessor` — the deliverable._
5. **Repoint consumers**: plugin containers and `stories-assistant`. `ChatModule` takes `Chat` from
   `@dxos/react-ui-assistant` and `useChatProcessor` from the plugin — a two-line change, and the
   right smoke test that the boundary is real. Per repo policy, **no compatibility re-exports**:
   every call site updates in the same change.

**Track B — unify the composer (independent of everything else)**

6. **One composer.** Re-base `Message.Textbox` and plugin-inbox's `Editor` on `ChatEditor`; move
   `command` (slash/mention) alongside `commands` (sentinel) as peer extension packs. Three
   consumers, no AI involvement, no dependency on tracks 0/A. _Test: `commands.test.ts`, `Message`
   stories, plugin-thread / plugin-review / plugin-inbox stories._

**Track C — the engine (gated on track 0)**

7. **Build `MessageList`** in `react-ui-chat` from the spike, with the block-renderer contract and
   the chrome render-prop. _Test: unit tests for the model/diff (ported from `sync.test.ts` and
   `TranscriptModel`), plus a story per island mode._
8. **Migrate renderers one at a time**, cheapest first, each landing independently: email
   (`ConversationStack` — gains virtualization it lacks today), then human chat + comments
   (`react-ui-thread` — chrome stays, stack mechanics go), then transcription, then the AI thread
   (last: it has the most behaviour riding on the current syncer).
9. **Retire** `MessageSyncer`, the second tile stack, and `TranscriptModel`'s document half.

**Then** the thread-tree work lands in `@dxos/react-ui-assistant`, where a scripted multi-branch Feed
renders with no model. If track 0 fails, this still proceeds on the moved-as-is renderer from step 3
— the tree work depends on the port and the Feed projection, not on the engine.

### 4.4 Effect on `stories-assistant`

`stories-assistant` is the full-stack integration surface (7 story files, ~10 peer plugins, live or
scripted EDGE AI). It consumes exactly three things from the plugin —
`@dxos/plugin-assistant/components` (`Chat`), `/hooks` (`useChatProcessor`, `usePresets`), and
`/Assistant` (`ChatViews`) — so the move costs it one import rewrite.

It should **stay full-stack**: its value is proving the composition against real plugins and a real
(or scripted) agent loop. The new package's stories are the complement, not a replacement — they
cover layout, streaming render, widget behaviour, and thread-tree navigation with no agent at all.
The two tiers answer different questions and both are needed.

---

## 5. Open questions

1. **Packaging shape** — three packages by role (§4.2 option 1, recommended), or commit directly to
   the single-package endpoint (option 3)?
2. **Package name** — `@dxos/react-ui-assistant`, or something narrower like
   `@dxos/react-ui-conversation`?
3. **Where the engine and contracts live** — `MessageList` + `MessageMetadata` / `MessageCallbacks` /
   block-renderer contract in `react-ui-chat` (as proposed), or in a dedicated
   `@dxos/react-ui-messages` that `react-ui-chat`, `react-ui-thread`, `react-ui-transcription` and
   the plugins all depend on? The latter avoids `react-ui-thread → react-ui-chat`, which reads
   backwards.
4. **Island granularity** — one island per `Message`, or per _block_? Per-message is simpler and
   matches the chrome; per-block would let a long tool result collapse independently, and the AI
   thread's blocks already render as separate document regions today.
5. **Non-markdown islands** — email HTML bodies (sanitized + CID image resolution) and any future
   custom tile cannot be a CodeMirror document. Confirm the engine takes an arbitrary-React escape
   hatch per island rather than assuming every island is a document.
6. **Selection across messages** — accept the regression with an explicit copy-thread affordance, or
   is continuous selection a requirement that would sink the island model?
7. **`Chat.Toolbar`** — move as presentation with injected `MenuActions`, or leave it in the plugin
   entirely? Leaving it means the package's composite story has no toolbar.
8. **Test-generator split** — does `testing/test-generator.ts` move (it needs a plugin-free half), or
   does the new package get a fresh Feed-shaped generator and the plugin keeps its own?
9. **Tree-of-threads scope** — is the model _within_ one Feed (lineage / soft fork, which
   `Feed.history` already supports) settled enough to build, or does the multi-Feed case need a
   design pass first? Multi-Feed changes the component's input from `chat` to a set of feeds, and
   that decision should land before step 4 fixes the composite's props.
10. **Does the tile chrome need lineage too?** `Feed.history` / `PARENT_KEY` are feed-level, so human
    channels and email threads could branch as well. If yes, `projectThread` / `resolveRewind` belong
    in the shared layer rather than in the assistant package.
