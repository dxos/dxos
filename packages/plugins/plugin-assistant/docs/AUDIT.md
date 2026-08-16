# plugin-assistant — chat UI audit & restructuring proposal

Scope: what actually renders a chat (prompt + thread) inside `plugin-assistant`, which parts of it
depend on the plugin system and which do not, and how the reusable half should be pushed down into a
lower-level package that can be developed against a **mock processor** — no AI loop.

That question does not stop at `plugin-assistant`. **Five** scenarios in the repo render a thread of
messages, across four packages and three plugins:

| Scenario           | Owner                                   | Renderer family       | Storage                    |
| ------------------ | --------------------------------------- | --------------------- | -------------------------- |
| AI chat            | `plugin-assistant`                      | document (CodeMirror) | `Feed` (`Chat.feed`)       |
| human chat         | `react-ui-thread` (via `plugin-thread`) | tile (Mosaic)         | `Feed` (channel backend)   |
| comments           | `react-ui-thread` (via `plugin-review`) | tile (Mosaic)         | `Thread.messages: Ref[]`   |
| transcription      | `react-ui-transcription`                | document (CodeMirror) | `Feed` (`Transcript.feed`) |
| email conversation | `plugin-inbox/ConversationStack`        | tile (Mosaic)         | ECHO query (mailbox)       |

§3 audits that tension; §4 proposes a split by **role** (composer / tile renderer / document
renderer) rather than by **speaker** (AI / human / email / machine).

Companion docs: [`DESIGN.md`](./DESIGN.md) (the end-to-end call stack and the test/story audit),
[`DEBUG.md`](./DEBUG.md) (AI → CodeMirror dataflow). This document does not repeat either; it is a
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

```text
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

| Tier               | Members                                                                                       | Consumers                                                | Types pulled in            |
| ------------------ | --------------------------------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------- |
| **A — loop**       | `messages`, `streaming`, `active`, `error`, `mcpErrors` atoms; `request` / `retry` / `cancel` | `Chat.Root`, `ChatPrompt`, `ChatStatus`, `ChatMcpErrors` | `Message.Message`, `Error` |
| **B — AI context** | `context` (`AiContext.Binder`), `registry` (`Registry.Registry`), `system`, `conversation`    | `ChatOptions`, `ChatReferences` only                     | `@dxos/assistant`          |

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

```text
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

| Use case           | Component chain                                                              | Editor base                   | Packages                                                              |
| ------------------ | ---------------------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------- |
| AI chat            | `Chat.Prompt` → `ChatPrompt` → **`ChatEditor`**                              | `Editor.Root` / `Editor.View` | `plugin-assistant` → `react-ui-chat` → `react-ui-editor`, `ui-editor` |
| human chat         | `MessageThread` → `Thread.Textbox` → **`Message.Textbox`**                   | `useTextEditor`               | `plugin-thread` → `react-ui-thread` → `react-ui-editor`, `ui-editor`  |
| comments           | `CommentThread` → `Thread.Textbox` → **`Message.Textbox`**                   | `useTextEditor`               | `plugin-review` → `react-ui-thread` → `react-ui-editor`, `ui-editor`  |
| transcription      | **none — audio**: `useAudioTrack` → `useTranscriber` → `MediaStreamRecorder` | n/a                           | `plugin-transcription` → `react-ui-transcription`                     |
| email conversation | `ConversationStack` → `EditMessage` → **inbox-local `Editor`** (72 LOC)      | `useTextEditor`               | `plugin-inbox` (own component) → `react-ui-editor`, `ui-editor`       |

**Three text composers over one editor core** (`ChatEditor`, `Message.Textbox`, inbox `Editor`), each
with its own submit convention and controller, plus one audio path. Extension packs are split
arbitrarily across them: `$sentinel` completion + `references` + `pendingText` live with the AI one,
`/slash` + `@mention` highlighting with the human one, neither available to the third. The one piece
of genuine reuse already crossing the boundary is the audio path — `plugin-assistant`'s
`useChatVoiceInput` drives `react-ui-transcription`'s capture into the chat composer.

**(b) Thread / stack of messages**

| Use case           | Render mechanism                                                                             | Family | Virtualized     | Body dispatch                                      | Packages                                                              |
| ------------------ | -------------------------------------------------------------------------------------------- | ------ | --------------- | -------------------------------------------------- | --------------------------------------------------------------------- |
| AI chat            | `ChatThread` → `MessageSyncer` → **`MarkdownStream`** (one CodeMirror doc, typewriter)       | D      | CM viewport     | `componentRegistry` (`XmlWidgetRegistry`, 11 tags) | `plugin-assistant` → `react-ui-markdown`, `ui-editor`                 |
| human chat         | `Thread.Messages` → **`Mosaic.VirtualStack`** → `Message.Group` / `Message.Tile`             | T      | ✅ TanStack     | `Message.Body` if-chain (4 block types)            | `plugin-thread` → `react-ui-thread` → `react-ui-mosaic`               |
| comments           | `CommentsArticle` → many small `CommentThread` → same `Thread.*` primitives                  | T      | ✅ (per thread) | same if-chain                                      | `plugin-review` → `react-ui-thread` → `react-ui-mosaic`               |
| transcription      | `Transcription` → `TranscriptModel<T>` → **`useTextEditor`** (one CodeMirror doc)            | D      | CM viewport     | `ChunkRenderer` + `xmlTags` (link-preview)         | `plugin-transcription` → `react-ui-transcription` → `react-ui-editor` |
| email conversation | `ConversationStack.Content` → **`Mosaic.Stack`** → `MessageTile` → `MarkdownViewer` / `Html` | T      | ❌ **none**     | mimeType switch (`text/html` vs markdown)          | `plugin-inbox` (own component) → `react-ui-mosaic`, `react-ui-editor` |

Storage under all five: `Feed` for AI chat (`Chat.feed`), human chat (channel backend) and
transcription (`Transcript.feed`); `Thread.messages: Ref<Message>[]` for comments; an ECHO query for
email. Every one of them is a list of `Message.Message` from `@dxos/types`.

### 3.0.1 Functionality aspects

The eight aspects any message-thread renderer has to answer, and where each of the five stands
today. ✅ = present, ➖ = absent, ⚠️ = present but constrained.

| Aspect                | AI chat                                               | human chat                                         | comments                                   | transcription                            | email                                                        |
| --------------------- | ----------------------------------------------------- | -------------------------------------------------- | ------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------ |
| **virtualization**    | ⚠️ CodeMirror viewport (implicit, one doc)            | ✅ `Mosaic.VirtualStack` (TanStack)                | ➖ `anchors.map(…)` — no virtualization    | ⚠️ CodeMirror viewport                   | ➖ `Mosaic.Stack` — no virtualization                        |
| **search**            | ➖ not enabled                                        | ➖                                                 | ➖                                         | ✅ `createBasicExtensions({ search })`   | ➖                                                           |
| **select (text)**     | ✅ continuous across messages (one doc)               | ➖ per-message only (each tile is its own CM view) | ➖ per-message only                        | ✅ continuous across the transcript      | ⚠️ within a tile; HTML tiles are plain DOM, markdown are not |
| **select (messages)** | ➖                                                    | ⚠️ `currentMessageId` (single)                     | ⚠️ current thread                          | ➖                                       | ⚠️ current message                                           |
| **streaming**         | ✅ typewriter + monotonic append (`MessageSyncer`)    | ➖                                                 | ➖                                         | ✅ live chunk append (`TranscriptModel`) | ➖                                                           |
| **mutability**        | ➖ no edit; rewind/fork instead                       | ✅ author edits own text in place (`onSave`)       | ✅ same primitives                         | ➖ read-only                             | ✅ inline reply drafts (`EditMessage`)                       |
| **renderers**         | markdown + 11 XML widget tags                         | markdown (per-message CM) + 3 block types          | same                                       | markdown + link-preview widget           | **two**: `text/html` → `Html`, else `MarkdownViewer`         |
| **chrome**            | `<branch>` XML tag in-document → fork / rewind / time | avatar, heading, time, delete, accept, grouping    | resolve, delete thread, accept, anchor nav | timestamp gutter                         | avatar, star, details, menu (reply/forward/delete/extract)   |

Reading the matrix:

1. **No scenario has more than four of the seven.** Every one is missing something another already
   solved — which is the argument for one engine stated as a capability table rather than as a code
   count.
2. **Virtualization and continuous text selection are currently exclusive.** The two document
   renderers get selection free and virtualization implicitly; the three tile renderers get the
   reverse (and two of the three don't even get virtualization). The engine has to deliver both, and
   §3.3.1 is why that requires owning selection at the model level.
3. **The critical precedent: `react-ui-thread` already mounts one CodeMirror view per message inside
   a `Mosaic.VirtualStack`.** `Message.Body` → `TextBlock` calls `useTextEditor` per message, with
   `readOnly: !editing`. **The item model is therefore already in production** — the engine's core
   hypothesis is not unproven, it is unmeasured and un-generalized. That materially lowers the risk
   in §3.3 cost 1 and is the first thing the spike should quantify.
4. **Two selection modes are needed, not one.** Text selection spanning message boundaries (a
   document-shaped gesture) and selection of _sets of messages_ (a list-shaped gesture — for
   forking, extracting, deleting, quoting). No current renderer has the second beyond "the current
   one".
5. **Email is the only two-renderer scenario** and the reason the item renderer must generalize
   beyond markdown (§5, decided).

### 3.1 Aspect 1 — the composer (duplicated; should be unified)

|            | `react-ui-chat` `ChatEditor`                                      | `react-ui-thread` `Message.Textbox`            | `plugin-inbox` `Editor` (72 LOC) |
| ---------- | ----------------------------------------------------------------- | ---------------------------------------------- | -------------------------------- |
| Base       | `Editor.Root` / `Editor.View`                                     | `useTextEditor`                                | `useTextEditor`                  |
| Controller | `ChatEditorController` (`getText` / `setText` / `focus` / `view`) | `MessageTextboxHandle` (`focus` only)          | none (uncontrolled)              |
| Submit     | `SubmitOptions.onSubmit(text) => boolean`                         | `keyBindings({ onSend, onClear })`             | caller-supplied keymap           |
| Chrome     | none (bare editor)                                                | wrapped in `MessageRoot` (avatar rail)         | none                             |
| Token pack | `commands` — `$sentinel` autocomplete                             | `command` — `/slash` + `@mention` highlighting | —                                |
| Extras     | `references` (dxn pills), `pendingText` (voice streaming)         | —                                              | —                                |

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

|              | AI chat — `plugin-assistant/ChatThread`                                                                                | transcription — `react-ui-transcription`                                                                                           |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| LOC          | 499 + 296 sync + 767 widgets                                                                                           | 67 + 203 ext + 229 model                                                                                                           |
| Sync engine  | `MessageSyncer` — block-level, append-only, monotonic-extension contract, per-message spans, widget-state side-channel | `TranscriptModel<T extends Chunk>` — **generic** over chunk type, append/update/delete, line-count map, abstracted `ChunkDocument` |
| Feed → model | `useQuery(feed)` + processor atoms, merged in `Chat.Root`                                                              | `useFeedModelAdapter(renderer, useQuery(feed))`                                                                                    |
| Widgets      | `xmlTags` + `XmlWidgetRegistry` (11 tags)                                                                              | `xmlTags` + `XmlWidgetRegistry` (link-preview)                                                                                     |
| Chrome       | inside the document — `<prompt>` decoration, `<branch>` toolbar tag                                                    | CodeMirror gutter (`TimestampMarker`)                                                                                              |

**Family T — tile.** A React component per message in a stack.

|                | human chat — `react-ui-thread`                                 | comments — `plugin-review`                       | email — `plugin-inbox`                                        |
| -------------- | -------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------- |
| LOC            | 1,673 (shared with comments)                                   | 235 + 565 containers                             | 1,063 + ~400                                                  |
| Stack          | `Mosaic.VirtualStack` (**virtualized**)                        | reuses `Thread.*`                                | `Mosaic.Stack` (**not** virtualized)                          |
| Body           | `Message.Body` if-chain — text, proposal, change, reference    | same                                             | mimeType switch — `text/html` → `Html`, else `MarkdownViewer` |
| Chrome         | avatar rail, heading, time, grouping, dividers                 | thread frame, resolve/accept controls, anchoring | avatar, heading, star, details, `Menu`, inline draft composer |
| Host injection | `MessageMetadata` / `ObjectTileComponent` / `MessageCallbacks` | same contracts                                   | own context + injected toolbar/actions                        |

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

### 3.3 The way out: one engine — a virtualized list of markdown items

The target architecture: **a virtualized list where each message is its own CodeMirror markdown
document ("item"), with React chrome around it.** One engine, owned by us, replacing both families.

```text
MessageList  (the engine)
├── model        readonly Message[]  +  renderMessage(message) => markdown
├── virtualizer  dynamic measurement + height cache; we own scroll anchoring
├── item       ONE PER MESSAGE (decided) — a CodeMirror view, pooled/recycled
│                extensions: markdown decoration · xmlTags(registry) · optional tail-append
│                a message's blocks render INLINE within its item, not as separate items
│                the renderer is GENERALIZED (decided): an item may be arbitrary React
│                  (email HTML with CID resolution, custom tiles) instead of a document
├── selection    model-level: (messageId, offset) anchors + copy interception
├── search       model-level: hits as (messageId, offset, length) → scrollToIndex + decorate
└── chrome       render-prop per message — avatar, heading, time, menu, star, branch toolbar
```

Each of the five scenarios then differs only in `registry` + `chrome` + `renderMessage`.

**Granularity: per message, not per block.** Blocks render inline inside a single message's
document, which keeps the item aligned with the unit that carries chrome (one avatar, one
timestamp, one menu per message) and keeps the virtualizer's item count equal to the message count.
The AI thread renders blocks as separate document regions today; under the engine those regions stay
regions, they just live in a per-message document rather than a per-thread one.

**What it buys**

1. **One rendering path.** Comments and email inherit markdown decoration and the widget registry;
   the AI thread keeps its widgets; transcription keeps its inline previews.
2. **Chrome stops being a hack.** `<branch>`-as-an-XML-tag and the timestamp gutter both become
   ordinary React around the item — finding 4 above, resolved structurally.
3. **Streaming gets simpler, not harder.** The streaming message is the tail item; the
   monotonic-append contract becomes per-item and `MessageSyncer`'s global cursor, line accounting
   and `MessageSpan` bookkeeping largely collapse.
4. **Virtualization for everyone.** Email conversations get it (they have none today); long channels
   and long chats stop paying for off-screen messages.
5. **Per-message editability** (comments, email drafts, message edit-in-place) is native to the
   item model, where it is awkward in a single shared document.

**What it costs — the parts that must be spiked before committing**

1. **N `EditorView`s.** One per visible message plus overscan (`Mosaic.VirtualStack` defaults to 8).
   Needs view pooling/recycling and minimal read-only extension sets. Measure before believing.
2. **Dynamic measurement vs CodeMirror's async layout.** The virtualizer needs heights; CodeMirror
   measures in its own phase, so an item that reflows after mount resizes underneath the
   virtualizer. This is the hard part and the most likely source of scroll jumps. Prototype three
   cases: mid-list growth, tail growth during streaming, and restore-scroll-on-remount.
3. **Selection and search move from CodeMirror to us** — one problem, not two. See §3.3.1.
4. **Minimap coordinates change** from document offsets to (item, offset); `buildMarkers` and
   `MessageSpan` need rework.

**What already exists to build on**

- `Mosaic.VirtualStack` — TanStack `useVirtualizer` with `measureElement` dynamic measurement,
  overscan, drag placeholders and pagination. The virtualization substrate is in place.
- `react-ui-masonry`'s height cache — the precedent for cheap remounts (`cacheKey`-scoped).
- `TranscriptModel` — the model/renderer/diff shape, minus the single-document assumption.
- `ConversationStack`'s tail-growth scroll re-pinning (ResizeObserver + settle window) — a working
  answer to cost 2 in the append case.

**Measured (2026-08-16, `@dxos/react-ui-feed`, 120Hz display, Chrome)**

Each pass is the same scripted gesture — `sweepScroll`, 3,000 px/s down for 5s and back — recorded
by `useFrameMeter`, both in the package's `#testing` entry.

| Pass                                           | p50 | p95 | worst     | hitches | frames        |
| ---------------------------------------------- | --- | --- | --------- | ------- | ------------- |
| `Large` — 2,000 msgs                           | 125 | 59  | 67ms      | 7       | 1,054 / 10.0s |
| `BadEstimate` — 2,000 msgs, `estimateSize: 24` | 125 | 111 | 34ms      | 2       | 1,140 / 10.0s |
| `BadEstimate` — its first 4.2s, mounting       | 125 | 13  | **950ms** | 13      | 140 / 4.2s    |
| `Streaming` — 30s of arriving turns            | 125 | 100 | 51ms      | 5       | 3,500 / 29.5s |

**Cost 1 is not real.** An unpooled list of read-only CodeMirror views scrolls at the display's rate:
the median frame is 8ms in every pass, and pooling would be optimising something that is not the
bottleneck. Item pooling can stay off the critical path.

**Cost 2 is real but is paid at mount, not while scrolling.** A deliberately bad estimate costs a
**950ms** stall as the list first measures — the worst single frame anywhere in these numbers — and
then scrolls _better_ than the well-estimated story (p95 111 vs 59), because by then every row it
touches has a real height. So the defect to design against is the arrival transient, not steady-state
drift; and the interesting artefact is that `Large`'s own p95 of 59 is that same correction, spread
thin.

**Fixed, and re-measured.** Three changes, in the order they were found:

1. **Open at the tail, mount only the tail** (`initialOffset`). The first commit built the window at
   offset 0 and the sticky effect then scrolled to the bottom, so every row was constructed twice —
   at both ends of the document, each one an `EditorView`.
2. **The estimate is the running average of what rows actually measure**, not a fixed number. A
   caller's estimate is a guess about content it has not seen; the list has measured some by then.
3. **Re-base the layout on that average, anchored on the reader.** The virtualizer rebuilds from its
   earliest pending measurement, so a tail-anchored feed rebuilds only the tail and everything above
   keeps the original guess. Resizing row 0 to the average is the supported way to make it start from
   the top again (clearing its caches leaves a layout with holes); the reader is then put back at the
   tail if they were following it, or on the message they were on. It converges after one pass.

| `BadEstimate` mount | p95 | worst | hitches | frames        |
| ------------------- | --- | ----- | ------- | ------------- |
| before              | 13  | 950ms | 13      | 140 / 4.2s    |
| after               | 100 | 567ms | 5       | 2,331 / 20.3s |

The remaining 567ms is not the list: a cold load of `Medium` (100 messages) costs 216ms and `Large`
449ms before anything is scrolled, which is module evaluation and the story generating its messages.
Scrolling is unchanged (`Large` sweep p95 59 → 59, worst 67 → 68ms) and `BadEstimate` now scrolls
like `Large` rather than better — its old advantage was that the 950ms stall had already measured
everything. The document is also the right length now: 328,796px against 55,245px, so the scrollbar
and every jump-to-index are honest from the first frame rather than after a traversal.

**Streaming is the cheapest of the three.** 3,500 frames with 5 hitches while the tail grows and the
follow runs: markdown re-parsing on one growing item does not compete with the scroll.

**The ceiling, for scale.** The first version of the sweep traversed the whole document in 6s —
40,000 px/s, some 400 rows a second — and the frame rate collapsed to 3–11fps with a hitch on nearly
every frame. Nothing a reader can do reaches that, but it marks where mount-and-measure saturates.

These numbers cannot be gathered by an agent's own browser: a pane that is not displayed does not
composite, so `requestAnimationFrame` is throttled to about 1fps (the meter reports it faithfully —
3 frames in 28.1s). They were taken by driving a real, visible Chrome window over the extension,
with `document.visibilityState` sampled throughout the pass to prove the tab stayed visible.

**Verdict: right target, spike first.** It is a better destination than "two renderers over one
model", because it collapses the families instead of blessing them. Cost 2 is the one that decides
it and is not knowable from reading code. The spike is small — a virtualized list of ~200 markdown
items with one streaming tail — and it gates everything in §4 that touches the renderer. Nothing
in the port/mock work (§4.3 track A steps 1–2, 4–5) depends on the outcome, so the spike can run in
parallel.

### 3.4 The five call sites, against one engine

All five now exist as stories in `@dxos/react-ui-feed` (`MessageList/Assistant`, `Email`, `Thread`,
`Comments`, `Transcript`), built from `testing/scenarios.tsx`. They are approximations — the fixtures
are synthetic and the widgets are stand-ins — but they are driven by the real engine, so what they
disagree about is real.

What a scenario supplies is a **renderer**, a **chrome** component and two options. Everything else —
virtualization, measurement, the index cursor, selection, search, the minimap — is the same code.

| Call site                                | Renderer          | Item body              | Chrome                                | Follows tail               | Row    |
| ---------------------------------------- | ----------------- | ---------------------- | ------------------------------------- | -------------------------- | ------ |
| AI chat (`plugin-assistant`)             | `chatRenderer`    | markdown + XML widgets | role, time, fork/rewind/reply, select | yes                        | ~160px |
| Email (`plugin-inbox`)                   | `defaultRenderer` | sanitized HTML         | from/address/subject/date header      | **no** — read from the top | ~220px |
| Human chat (`react-ui-thread`)           | `defaultRenderer` | markdown               | avatar, name, time                    | yes                        | ~64px  |
| Comments (`plugin-review`)               | `defaultRenderer` | markdown               | quoted anchor, resolve toggle         | no                         | ~96px  |
| Transcription (`react-ui-transcription`) | `defaultRenderer` | markdown               | timestamp + speaker, no separators    | yes                        | ~48px  |

**What the exercise proved.** Two engine gaps showed up as soon as a second scenario existed, both
now fixed: React block widgets need a portal host per item (`MarkdownItem` owns `setWidgets` and
renders the portals — without it the widgets reserved space and drew nothing), and a registry has to
reach the **parser**, not only the decorations (`extendedMarkdown({ registry })`; with plain
`createMarkdownExtensions` every tag rendered as literal angle brackets). A third was a design error
found the same way: `<prompt>` wrapping lived in the default renderer, so a transcript — which has no
registry — showed the speaker their own markup. Prompts moved to `chatRenderer`.

**What each still needs, in the order it will bite.**

1. **Email** — the HTML item has no prose styling, so a `blockquote` and a `ul` render as flat text.
   It also needs quoted history collapsed, which is a per-item affordance the chrome cannot express
   today because it cannot change the item's height without re-measuring the row.
2. **Human chat** — consecutive turns from one speaker should read as one block, and chrome is given
   only its own message and index; grouping needs the neighbour. Either the engine passes it, or the
   host closes over the array (which the story does, and which breaks under a windowed model).
3. **Comments** — the anchor is a range in another document; the pairing (scroll the feed from the
   editor, highlight the editor from the feed) is the whole feature and is outside the list.
4. **Transcription** — an utterance is edited in place as recognition improves, so the item needs
   mutation that is neither an append nor a remount; the delta path currently assumes a growing tail.
5. **AI chat** — the widgets here are stand-ins; the real ones move down with the plugin, and tool
   state has to survive a remount from the message alone (the plugin keeps it beside the document).

#### 3.3.1 Selection and search

Both are the same problem wearing two hats, and the answer to both is **the model, not the DOM**.

**Why native selection breaks.** Each item is an `EditorView`, and today `readOnly` maps to
`EditorState.readOnly.of(true)` plus a transaction filter
([`factories.ts:151`](../../../ui/ui-editor/src/extensions/core/factories.ts)) — it does **not** set
`EditorView.editable.of(false)`. The DOM stays `contenteditable="true"`, and browsers refuse to
extend one selection across two contenteditable hosts, so a drag from message 1 into message 3
collapses into one of them.

**One lever exists.** The engine can set `EditorView.editable.of(false)` on non-focused items.
Non-editable CodeMirror is ordinary DOM and native selection spans ordinary DOM freely, so
cross-item selection works for the read-only case — the common one. Two caveats: an _editable_
item (draft, edit-in-place) reintroduces a boundary at its edges; and a native copy then yields the
**rendered** text rather than the markdown source, because `decorateMarkdown` replaces ranges with
widgets.

**Virtualization defeats the DOM answer regardless.** Unmounted items are not in the DOM, so Cmd+A
and long drags cannot reach them whatever the contenteditable state. Any correct implementation has
to reconstruct from the model.

**So both become model-level operations**, which we can do because the engine owns
`renderMessage(message) => markdown`:

|        | Implementation                                                                                                               | Consequence                                                     |
| ------ | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Copy   | track anchor/focus as `(messageId, offset)`; intercept `copy`; slice the model between them                                  | markdown source, includes unmounted messages, DOM-independent   |
| Search | scan the model; hits as `(messageId, offset, length)`; `virtualizer.scrollToIndex` then push a decoration set into that item | reaches unmounted messages **and** content hidden by `viewType` |

**Search is a gain, not a regression.** Only transcription enables CodeMirror search today
(`createBasicExtensions({ search: true })`); the AI thread does not
([`MarkdownStream.tsx:303`](../../../ui/react-ui-markdown/src/MarkdownStream/MarkdownStream.tsx)
passes only `lineWrapping` + `readOnly`), and neither tile renderer has any. Four of five scenarios
have no thread search at all — model-level search gives it to all five, including over blocks the
current `viewType` filters out (e.g. reasoning in `normal` view), which no renderer can do today.

**Net cost, stated precisely.** Items move selection and copy from "free from CodeMirror" to
"implemented by us over the model" — bounded, unit-testable without a DOM, and strictly more
capable. The irreducible part is that a browser-native drag-select across the whole thread needs
both the `editable: false` lever and a copy interceptor to be complete.

---

## 4. Proposal — split by role, not by speaker

The target is a package where the **chat / thread / tree loop can be developed against a mock
processor**, consumed from `plugin-assistant`. Getting there also resolves §3's tension, provided
the packages are re-cut along _what the component is_ rather than _who is talking_.

```text
plugin-assistant · plugin-thread · plugin-review · plugin-inbox · plugin-transcription
       each supplies: registry extensions · per-message chrome · host callbacks
    ↓
@dxos/react-ui-assistant     Chat.Root/Content/Prompt/Minimap/Status/TaskList
   (new)                     Chat.Thread = MessageList + AI registry + AI chrome
                             projectThread / resolveRewind (Feed lineage) + thread-tree UI
                             ChatProcessor port + MockChatProcessor (scripted, no AI)
                             ✗ NO @dxos/assistant (no AiContext) in phase 1
    ↓
@dxos/react-ui-chat          THE COMPOSER: ChatEditor (one composer) · extension packs
   (widened)                   ($sentinel, /slash, @mention, references, pendingText) ·
                               ChatDialog · ChatStatus
    ↓
@dxos/react-ui-feed          THE ENGINE + shared contracts (§4.0):
   (new)                     MessageList (§3.3) — virtualized items, chrome render-prop,
                               model-level selection + search (§3.3.1)
                             MessageMetadata / MessageCallbacks / block-renderer contract
                             deps: react-ui-mosaic, react-ui-markdown, react-ui-editor,
                                   ui-editor, echo, types
    ↑                              ↑                              ↑
react-ui-thread            plugin-inbox                  react-ui-transcription
  chat + comments chrome     email chrome + HTML item     timestamp chrome + chunk renderer
```

Five renderers become **one engine plus five chrome/registry configurations**, over one composer and
one message model. `react-ui-thread` keeps its scenario-specific chrome and contracts; what it stops
owning is the stack mechanics.

### 4.0 Where the engine lives — the candidate packages

| #   | Package                       | Holds today                        | `@dxos` deps                                | Consumers                                           | As engine host                                                                                  |
| --- | ----------------------------- | ---------------------------------- | ------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | `react-ui-chat`               | ChatEditor, ChatDialog, ChatStatus | no echo                                     | plugin-assistant, composer-crx, 2 stories           | forces `react-ui-thread → react-ui-chat`; "thread depends on chat" reads backwards              |
| 2   | `react-ui-thread`             | Thread/Message tiles, textbox      | echo, types, **mosaic**, editor             | plugin-thread, plugin-review                        | forces `react-ui-chat → react-ui-thread`; also carries human-chat chrome, so not separable      |
| 3   | `react-ui-markdown`           | MarkdownStream                     | echo, editor, ui                            | **8** incl. react-ui-components, react-ui-form      | closest in spirit ("a markdown document"), already echo+editor; singular-document, needs mosaic |
| 4   | `react-ui-mosaic`             | Stack / VirtualStack, dnd          | echo, echo-react, menu, search              | **21**                                              | wrong altitude — a layout primitive; `Message`/`ContentBlock` would pollute 21 consumers        |
| 5   | `react-ui-transcription`      | TranscriptModel, audio capture     | echo, types, av, pipeline                   | plugin-assistant, plugin-transcription              | domain-named for audio; wrong home                                                              |
| 6   | **new `@dxos/react-ui-feed`** | —                                  | mosaic, list, markdown, editor, echo, types | would be: 1, 2, 5, react-ui-assistant, plugin-inbox | **no backwards edge** — every existing package depends downward into it                         |

**Recommended: 6, named `@dxos/react-ui-feed`.** Every existing candidate creates either a backwards
edge (1, 2) or pollution (4). The name follows the data abstraction rather than a rendering shape:
the thing that holds across all five scenarios is a **`Feed` of `Message` objects**, `Feed` is
already the `@dxos/echo` primitive, and "feed" is unclaimed in the UI namespace where "chat"
(composer) and "thread" (comments + human chat) are both taken and both mean something narrower.

Siting the prototype:

1. **`react-ui-feed` (recommended).** The prototype is the package's first content, so there is
   nothing to unpick later if it works, and nothing entangled to delete if it does not. `private: true`
   until it earns a publisher.
2. **`react-ui-chat`.** Would mean the composer package temporarily owns a renderer, and would drag
   `echo` + `types` + `mosaic` into a package that has none of them — changes that only make sense if
   the engine stays there permanently, which §4.0 argues against.
3. **`react-ui-thread`.** Closest to the prototype's substrate (it already has `mosaic` + `echo` +
   per-message editors — see §3.0.1 finding 3), so it is the cheapest place to _measure_. But its
   existing `Thread.*` / `Message.*` API and two consumers would sit alongside the prototype, and
   separating them afterwards is exactly the work option 1 avoids. Reasonable if the goal is only to
   get a scrolling number quickly.

Fallback if a new package is unwelcome: option 3 in the table (`react-ui-markdown`) — it already has
echo + editor + the widest reach, and would gain `react-ui-mosaic` and `Message` awareness.

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

**Moves into `@dxos/react-ui-chat`** (the composer consolidation):

- `react-ui-thread`'s `command` extension (slash/mention) as a peer of `commands` (sentinel)
- plugin-inbox's `Editor` and `Message.Textbox` re-based on `ChatEditor`

**New in `@dxos/react-ui-feed`** (the engine, §4.0):

- `MessageList` — seeded from `TranscriptModel`'s model/renderer/diff shape and
  `Mosaic.VirtualStack`'s virtualizer, replacing `MessageSyncer` and both tile stacks
- `MessageMetadata` / `MessageCallbacks` / the block-renderer contract — shared vocabulary every
  renderer imports (moved out of `react-ui-thread`, which keeps its chrome)
- model-level selection and search (§3.3.1)

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
   convergence that is still an open question. Reasonable as the _destination_ after (1) proves the
   contracts.
4. **Reorganise in place (subpath exports only).** Cheapest, but buys nothing structural: the chat
   UI still cannot be rendered without the plugin's capability graph, which is the actual complaint.
5. **Do nothing until the thread-tree design settles.** Defensible, but the tree work will double the
   size of `components/Chat`, and moving 6k LOC is strictly harder than moving 3.6k.

### 4.3 Suggested sequencing

Three tracks. **Track 0 is the gate** — it decides whether track C is possible at all, and it blocks
nothing else. Tracks A and B are independent of its outcome and can start immediately.

**Track 0 — the engine spike (do this first; storybook, `@dxos/react-ui-feed`, §4.0)**

**Deciding criterion: virtualization quality — smooth scrolling with no jumps or drift.** Everything
else in the spike is secondary; if scrolling is not good, the engine does not happen and track C is
dropped.

0. Build the prototype and demonstrate:

   **(a) `Feed` of `Message` as the data abstraction.** One input shape for all five scenarios —
   `useQuery(db, Query.from(feed))` → model. Prove it by seeding the same story from an AI chat
   feed, a channel feed and a transcript feed; carry the comments case (`Thread.messages: Ref[]`)
   and the email case (mailbox query) as adapters onto the same model, which also tests whether the
   abstraction really does hold or whether two of the five need an escape hatch.

   **(b) We control virtualization.** Analyse and choose between the two existing substrates — they
   are complementary, not alternatives:
   - `react-ui-mosaic` — `Mosaic.VirtualStack`: TanStack `useVirtualizer`, `measureElement` dynamic
     measurement, `getItemKey` so the size cache survives reorder, gap/padding insets, overscan
     (default 8), pagination, drag placeholders, `scrollToId` registration. This is the scroll
     substrate; the open question is whether its drag-placeholder index doubling and dnd coupling
     are wanted here, or whether the engine should drive `useVirtualizer` directly.
   - `react-ui-list` — **not** a virtualizer: `Tree`/`Listbox`/`Picker`/`OrderedList` plus
     `aspects/` hooks (`useListSelection` single/multi, `useListNavigation` roving tabindex,
     `useListDisclosure`, `useReorder`). This is where **message-set selection** and keyboard
     navigation come from (§3.0.1 finding 4) — reuse the aspect hooks rather than reinventing them.

     Measure: scroll smoothness at 200 / 2,000 messages, cost of N `EditorView`s with and without
     pooling, and whether dynamic measurement survives mid-list growth, tail growth during
     streaming, and restore-scroll-on-remount. Baseline to beat: `react-ui-thread` already runs
     per-message CodeMirror views inside `Mosaic.VirtualStack` in production (§3.0.1 finding 3), so
     measure that first — it is the honest starting number.

   **(c) Per-message renderer variants.** Three items in one list: markdown (CodeMirror +
   `xmlTags` registry), HTML (sanitized, non-editor — the email case), and streaming (tail append
   with typewriter). Mixed in a single feed, since email threads and AI chats both contain more than
   one kind.

   **(d) Aspects.** Exercise §3.0.1 against the prototype: model-level search across mounted and
   unmounted messages; text selection across item boundaries including the
   `EditorView.editable.of(false)` question (§3.3.1, open question 5); message-set selection via
   `useListSelection`; per-message chrome (fork, rewind, reply-to) as a render-prop.

   _Deliverable: stories per variant, a scrolling measurement, and a findings paragraph appended to
   §3.3 recording what held and what did not._

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
   extension point — deliberately _not_ a rewrite, since track C may replace the syncer's internals
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

7. **Build `MessageList`** in `@dxos/react-ui-feed` from the spike, with the block-renderer contract and
   the chrome render-prop. _Test: unit tests for the model/diff (ported from `sync.test.ts` and
   `TranscriptModel`), plus a story per item mode._
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

## 5. Decisions and open questions

**Decided**

- **Item granularity: per message.** Blocks render inline within a message's item (§3.3).
- **The message renderer is generalized** — an item may be an arbitrary React component rather
  than a markdown document, which is what lets email HTML (sanitized + CID resolution) participate
  (§3.3).
- **Selection and search are model-level**, not DOM-level, and search is a net gain rather than a
  regression (§3.3.1).

**Open**

1. **Engine home / prototype site** — new `@dxos/react-ui-feed` (§4.0, recommended),
   `react-ui-thread` (cheapest place to measure, most to unpick afterwards), or `react-ui-chat`?
2. **Packaging shape** — three packages by role (§4.2 option 1, recommended), or commit directly to
   the single-package endpoint (option 3)?
3. **Package name** for the assistant layer — `@dxos/react-ui-assistant`, or something narrower like
   `@dxos/react-ui-conversation`?
4. **Where the shared contracts live** — `MessageMetadata` / `MessageCallbacks` / block-renderer
   contract alongside the engine (natural), or separately in `react-ui-chat`?
5. **`editable: false` for non-focused items** — adopt it so native selection spans read-only
   items (§3.3.1), accepting that a native copy yields rendered text while the copy interceptor
   yields markdown? Or keep every item editable-shaped and rely solely on the interceptor?
6. **`Chat.Toolbar`** — move as presentation with injected `MenuActions`, or leave it in the plugin
   entirely? Leaving it means the package's composite story has no toolbar.
7. **Test-generator split** — does `testing/test-generator.ts` move (it needs a plugin-free half), or
   does the new package get a fresh Feed-shaped generator and the plugin keeps its own?
8. **Tree-of-threads scope** — is the model _within_ one Feed (lineage / soft fork, which
   `Feed.history` already supports) settled enough to build, or does the multi-Feed case need a
   design pass first? Multi-Feed changes the component's input from `chat` to a set of feeds, and
   that decision should land before step 4 fixes the composite's props.
9. **Does the tile chrome need lineage too?** `Feed.history` / `PARENT_KEY` are feed-level, so human
   channels and email threads could branch as well. If yes, `projectThread` / `resolveRewind` belong
   in the shared layer rather than in the assistant package.
