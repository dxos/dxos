# plugin-assistant — chat UI audit & restructuring proposal

Scope: what actually renders a chat (prompt + thread) inside `plugin-assistant`, which parts of it
depend on the plugin system and which do not, and how the reusable half should be pushed down into a
lower-level package that can be developed against a **mock processor** — no AI loop.

That question does not stop at `plugin-assistant`: the same two aspects (a composer, a thread) are
implemented three times across `@dxos/react-ui-chat`, `@dxos/react-ui-thread`, and
`plugin-inbox`'s `ConversationStack`. §3 audits that tension; §4 proposes a split by **role**
(composer / tile renderer / streaming renderer) rather than by **speaker** (AI / human / email).

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

## 3. The `react-ui-chat` / `react-ui-thread` / `ConversationStack` tension

The existing packages are split by **who is talking** (AI vs human vs email correspondent) rather
than by **what the component is** (composer vs thread). That is the wrong axis, and it is why the
same two aspects are implemented **three** times.

```
@dxos/react-ui-chat     (AI side)     ChatEditor · ChatDialog · ChatStatus · ChatStatusIndicator
                                      deps: react-ui, react-ui-components, react-ui-dnd,
                                            react-ui-editor, ui-editor, ui-theme, async, util
                                      consumers: plugin-assistant, composer-crx, stories-assistant

@dxos/react-ui-thread   (human side)  Thread.{Root,Content,Header,Messages} ·
                                      Message.{Root,Tile,Group,Body,Textbox,Heading,Time} ·
                                      command · ThreadContextValue
                                      deps: echo, types, react-ui-editor, react-ui-mosaic,
                                            react-ui-dnd, ui-editor, util, date-fns
                                      consumers: plugin-thread, plugin-review

plugin-inbox           (email side)   ConversationStack.{Root,Content,MessageTile,SummaryTile,
                                        MessageBody,MessageDetails,MessageMenu,MessageStar} ·
                                      MarkdownViewer — 1,063 + ~400 LOC, in-plugin
                                      deps: echo, types, react-ui-mosaic, react-ui-card,
                                            react-ui-menu, markdown, app-framework
```

### 3.1 Aspect 1 — the composer (duplicated; should be unified)

|                | `react-ui-chat` `ChatEditor`                                | `react-ui-thread` `Message.Textbox`               |
| -------------- | ----------------------------------------------------------- | ------------------------------------------------- |
| Base           | `Editor.Root` / `Editor.View` (`@dxos/react-ui-editor`)      | `useTextEditor` directly                          |
| Controller     | `ChatEditorController` (`getText` / `setText` / `focus` / `view`) | `MessageTextboxHandle` (`focus` only)        |
| Submit         | `SubmitOptions.onSubmit(text) => boolean`                    | `keyBindings({ onSend, onClear })`                |
| Chrome         | none (bare editor)                                           | wrapped in `MessageRoot` (avatar rail)            |
| Token pack     | `commands` — `$sentinel` autocomplete (project instructions) | `command` — `/slash` + `@mention` highlighting    |
| Extras         | `references` (dxn pills), `pendingText` (voice streaming)    | —                                                 |

These are two CodeMirror composers with different submit conventions and different controller
contracts, and the divergence is accidental: **nothing about `/slash` + `@mention` is human-only, and
nothing about `$sentinel` completion is AI-only.** `ChatEditor` is the better base — it already
separates the editor from its chrome and exposes a fuller controller. The token packs are just
extensions and should all be importable regardless of who is typing.

**Unify:** `Message.Textbox` becomes `ChatEditor` + author chrome; `command` (slash/mention) moves
next to `commands` (sentinel) as a peer extension. This is a contained change with two consumers
(plugin-thread, plugin-review) and is worth doing on its own merits, independent of the rest.

### 3.2 Aspect 2 — the thread (three renderers, one model)

All three render the **same model**: `Message.Message[]` from `@dxos/types`, stored in a `Feed`
(plugin-thread channels are Feed-backed via `channel-backend-feed.ts`, exactly like chats; mailbox
messages are ECHO objects queried into a list). The model is not the problem.

| Concern            | AI — `plugin-assistant/ChatThread`                                                                                                                                       | Human — `react-ui-thread/Thread`                                                                   | Email — `plugin-inbox/ConversationStack`                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| LOC                | 499 + 296 sync + 767 widgets                                                                                                                                             | 1,673                                                                                              | 1,063 + ~400 helpers                                                                          |
| Render strategy    | **one CodeMirror document** — `MessageSyncer` appends deltas into `MarkdownStream`; typewriter drip; monotonic-append contract                                            | **virtualized tile stack** — `Mosaic.Stack`, sender grouping, time dividers, dnd                    | **virtualized tile stack** — `Mosaic.Container` + `ScrollArea` + `Mosaic.Stack`, no grouping   |
| Body dispatch      | `componentRegistry` (`XmlWidgetRegistry`) + `createBlockRenderer` — text, reasoning, toolCall/Result, status, summary, select, suggestion, reference, stats, surface, json | `Message.Body` if-chain — text, proposal, change, reference                                        | mimeType dispatch — `text/html` → `Html`, else `MarkdownViewer` (read-only CodeMirror)         |
| Per-message chrome | `<prompt>` decoration + `BranchWidget` (fork/rewind)                                                                                                                     | avatar rail, heading, time, group continuation                                                     | avatar, heading, star, details, per-message `Menu`, inline reply-draft composer                |
| Host injection     | none — `SurfaceWidget` reaches for `app-framework` directly                                                                                                              | **solved**: `MessageMetadata` / `ObjectTileComponent` / `MessageCallbacks` via `ThreadContextValue` | partial — context + injected toolbar/action hooks, but `app-framework` imported directly       |

Findings:

1. **Two of the three are the same strategy.** `Thread.Messages` and `ConversationStack.Content` are
   both `Mosaic.Stack` over `Message.Message`, differing only in per-message chrome and body
   renderer — ~2,700 LOC implementing one primitive twice, with nothing to do with AI. This is the
   clearest duplication in the area.
2. **`react-ui-thread` already has the injection pattern the other two need.** Its `components.Object`
   slot is exactly the shape of the `SurfaceWidget` problem (coupling point 2) and of
   `ConversationStack`'s toolbar/extractor injection, solved cleanly. Adopt it rather than inventing
   a third convention.
3. **Body dispatch should be one registry, N back-ends.** Today one side has a proper registry and
   another an if-chain that would silently drop nine AI block types, and a third a mimeType switch.
   A shared _block-renderer contract_ — tag → renderer, where the tile renderer registers React
   components and the stream renderer registers markdown+XML — is the concrete unification step, and
   it is small and unit-testable.
4. **The document renderer should NOT be collapsed into the tile renderer.** Streaming AI output into
   a tile stack forfeits the typewriter/monotonic-append contract that the syncer and its 451 LOC of
   tests are built on; conversely a long email or channel thread wants per-message DOM (star, menu,
   inline draft composer). **Two** renderers over one model and one registry is defensible — three
   implementations is not.
5. **`@dxos/echo` in `react-ui-chat` is not the constraint.** `react-ui-thread` already depends on
   `echo` + `types` and is none the worse for it; `react-ui-markdown` does too. The dependency worth
   holding the line on is `@dxos/assistant` (`AiContext`) — that is AI-loop machinery, not chat UI.

---

## 4. Proposal — split by role, not by speaker

The target is a package where the **chat / thread / tree loop can be developed against a mock
processor**, consumed from `plugin-assistant`. Getting there also resolves §3's tension, provided
the packages are re-cut along *what the component is* rather than *who is talking*.

```
@dxos/plugin-assistant       capabilities · operations · containers · AiChatProcessor
                             injects: Surface widget · voice actions · toolbar operations ·
                                      ChatOptions/ChatReferences (AiContext)
    ↓
@dxos/react-ui-assistant     Chat.Root/Content/Prompt/Minimap/Status/TaskList
   (new)                     Chat.Thread — the STREAMING renderer (MessageSyncer,
                                blockToMarkdown, XML widget registry, AI widgets)
                             projectThread / resolveRewind (Feed lineage) + thread-tree UI
                             ChatProcessor port + MockChatProcessor (scripted, no AI)
                             deps: react-ui-chat, react-ui-markdown, react-ui-components,
                                   react-ui-menu, ui-editor, echo, echo-react, types
                             ✗ NO @dxos/assistant (no AiContext) in phase 1
    ↓
@dxos/react-ui-chat          THE COMPOSER + shared thread contracts:
   (widened)                 ChatEditor (one composer) · extension packs ($sentinel, /slash,
                               @mention, references, pendingText) · ChatDialog · ChatStatus
                             MessageMetadata / MessageCallbacks / block-renderer contract
                             may take @dxos/echo + @dxos/types (see §3.2 finding 5)
    ↑
@dxos/react-ui-thread        THE TILE renderer: Thread.Messages · Message.Tile/Group/Body
   (rebased)                 Message.Textbox → ChatEditor + author chrome
                             absorbs plugin-inbox's ConversationStack skeleton
```

Three renderers become **two**, sharing one composer, one message model, one block-renderer
contract, and one host-injection convention.

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
- `MessageMetadata` / `MessageCallbacks` / the block-renderer contract — shared vocabulary both
  renderers import

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

Each step is independently landable and testable. Steps 1–5 deliver the mock-processor loop; 6–7 are
the convergence work and can run in parallel or later.

**Track A — the mock-processor loop (the immediate goal)**

1. **Design the `ChatProcessor` port** in the plugin (no move yet): an interface + `AiChatProcessor
   implements ChatProcessor` + a `MockChatProcessor` in `#testing` driving the atoms from a scripted
   message list. Prove it by rewriting `Chat/Error.stories.tsx` against the mock. _Test: existing
   plugin tests + the rewritten story._
2. **Extract the prompt's actions slot**, moving `ChatOptions` / `ChatReferences` / `ChatActions`
   from `ChatPrompt`'s body to a prop. This is what keeps `AiContext` out of the new package, and it
   is verifiable in place before anything moves. _Test: `ChatOptions.stories.tsx`, `SpaceHomePrompt`._
3. **Move the leaf-most subtree**: `ChatThread` + `sync/` + `registry.tsx` + widgets (minus
   `SurfaceWidget`), with `createComponentRegistry({ extensions })`. Its stories and its 451 LOC of
   sync tests move with it. _Test: `sync.test.ts`, `tool-widget-state.test.ts`, widget stories,
   `MarkdownStream.stories.tsx`._
4. **Move `Chat` + `ChatPrompt` + `TaskList`** onto the port and the slot. _Test: `thread.test.ts`
   plus a new composite story driven only by `MockChatProcessor` — the deliverable._
5. **Repoint consumers**: plugin containers and `stories-assistant`. `ChatModule` takes `Chat` from
   `@dxos/react-ui-assistant` and `useChatProcessor` from the plugin — a two-line change, and the
   right smoke test that the boundary is real. Per repo policy, **no compatibility re-exports**:
   every call site updates in the same change.

**Track B — resolving the three-way duplication**

6. **Unify the composer.** Re-base `Message.Textbox` on `ChatEditor`; move `command`
   (slash/mention) alongside `commands` (sentinel) as peer extension packs. Two consumers
   (plugin-thread, plugin-review) and no AI involvement. _Test: `commands.test.ts`, `Message`
   stories, plugin-thread and plugin-review stories._
7. **Unify the tile renderer.** Extract the shared `Mosaic.Stack`-over-`Message.Message` skeleton +
   the block-renderer contract, then rebuild `ConversationStack` on it, keeping inbox-specific chrome
   (star, details, menu, inline draft) as injected slots. _Test: `ConversationStack.stories.tsx`,
   `Thread.stories.tsx`, plugin-inbox play tests._

**Then** the thread-tree work lands in `@dxos/react-ui-assistant`, where a scripted multi-branch Feed
renders with no model.

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
3. **Where the shared contracts live** — `MessageMetadata` / `MessageCallbacks` / block-renderer
   contract in `react-ui-chat` (as proposed), or in a contracts-only package that all three
   renderers depend on?
4. **`Chat.Toolbar`** — move as presentation with injected `MenuActions`, or leave it in the plugin
   entirely? Leaving it means the package's composite story has no toolbar.
5. **Test-generator split** — does `testing/test-generator.ts` move (it needs a plugin-free half), or
   does the new package get a fresh Feed-shaped generator and the plugin keeps its own?
6. **Tree-of-threads scope** — is the model _within_ one Feed (lineage / soft fork, which
   `Feed.history` already supports) settled enough to build, or does the multi-Feed case need a
   design pass first? Multi-Feed changes the component's input from `chat` to a set of feeds, and
   that decision should land before step 4 fixes the composite's props.
7. **Does the tile renderer need lineage too?** `Feed.history` / `PARENT_KEY` are feed-level, so
   human channels and email threads could branch as well. If the answer is yes, `projectThread` /
   `resolveRewind` belong in the shared contracts layer rather than in the assistant package.
