# plugin-assistant — chat UI audit & restructuring proposal

Scope: what actually renders a chat (prompt + thread) inside `plugin-assistant`, which parts of it
depend on the plugin system and which do not, and whether the reusable half should be pushed down
into a lower-level `@dxos/react-ui-assistant` package.

Companion docs: [`DESIGN.md`](./DESIGN.md) (the end-to-end call stack and the test/story audit),
[`DEBUG.md`](../DEBUG.md) (AI → CodeMirror dataflow). This document does not repeat either; it is a
**structural** audit, where DESIGN.md is a **behavioural** one.

Measured on branch `claude/ai-chat-interface-restructure-bdc043`.

---

## 1. Why the plugin is hard to work in

`src/` is **20,204 lines**. The chat UI is a minority of it, but it is entangled with the rest:

| Area                         | LOC       | Role                                                             |
| ---------------------------- | --------- | ---------------------------------------------------------------- |
| `components/`                | 6,396     | Chat composite, prompt, thread, widgets, task list, toolbox       |
| `execution-graph/`           | 3,510     | Trace → span tree (debug/trace panel only)                        |
| `containers/`                | 2,971     | Surface-mounted containers (11 lazy entries)                      |
| `capabilities/`              | 1,614     | 20+ plugin modules (AI service, agent runtime, graph, settings …) |
| `hooks/`                     | 1,261     | 15 hooks — half UI, half plugin/capability plumbing               |
| `processor/`                 | 1,020     | `AiChatProcessor` — the client-side request/stream state machine  |
| `operations/`, `types/`, `testing/`, `templates/`, `skills/`, `util/`, `extensions/` | ~2,600 | The rest |

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

| Consumer                            | Uses                                                     |
| ----------------------------------- | -------------------------------------------------------- |
| `containers/ChatDialog`             | `Chat.Root → {Thread, Prompt}`                            |
| `containers/ChatCompanion`          | wraps `ChatArticle` (adds skills + companion wiring)      |
| `containers/SpaceHomePrompt`        | **`ChatPrompt` alone**, no `Chat.Root`                    |
| `stories-assistant/modules/ChatModule` | `Chat.Root → {Toolbar, Content, Thread, TaskList, Prompt}` |

Four different assemblies of the same parts is evidence the composite API is already the right
shape. `SpaceHomePrompt` is the informative case: it uses `ChatPrompt` with `processor` / `event` /
`db` / `chat` passed explicitly, which is why `ChatPrompt` has a props-based API and `Chat.Prompt`
is only a thin context adapter over it. The prompt is *already* decoupled from the composite.

### 2.1 Size of the candidate surface

Excluding `*.stories.tsx` / `*.test.ts`:

| Subtree                  | src LOC | tests/stories LOC | Verdict                                    |
| ------------------------ | ------- | ----------------- | ------------------------------------------ |
| `components/Chat`        | 821     | 231               | movable behind a processor port            |
| `components/ChatPrompt`  | 1,215   | 137               | movable except `ChatActions` + voice input |
| `components/ChatThread`  | 499     | 604               | movable                                    |
| `components/ChatThread/widgets` | 767 | 261              | movable except `SurfaceWidget`             |
| `components/ChatThread/sync` | 296 | 451               | movable as-is                              |
| `components/TaskList`    | 72      | 58                | movable as-is                              |
| **Total**                | **3,670** | **1,742**       | ~**3,100 LOC** carry no plugin dependency  |

### 2.2 The five coupling points

Everything else is mechanical. These five are the actual design work:

| #   | Coupling                                                                    | Where                                    | Nature                                        |
| --- | --------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------- |
| 1   | `AiChatProcessor` — a concrete class built from Effect layers + capabilities | `Chat.Root`, `ChatPrompt`, `ChatStatus`  | needs an interface (port)                     |
| 2   | `SurfaceWidget` → `Surface` + `ChatSurface` role                             | `ChatThread/widgets/SurfaceWidget.tsx`   | needs a widget-registry extension point        |
| 3   | `ChatActions` + `useChatVoiceInput` → plugin-transcription capabilities      | `ChatPrompt/`                            | needs a slot (children/render prop)            |
| 4   | `useChatToolbarActions` → `Operation.invoke`                                 | `Chat.Toolbar`                           | stays in the plugin                            |
| 5   | `meta.profile.key` translation namespace (`#meta`)                           | ~12 files                                | needs the package's own namespace              |

**Point 1 is not just five atoms.** Consumers read `processor.messages / streaming / active / error
/ mcpErrors` **and** `processor.context` (`AiContext.Binder`), `processor.registry`
(`Registry.Registry`), `processor.system`, plus `request / retry / cancel`. A port that hides the
Effect layers still exposes `@dxos/assistant` types — which is fine (`@dxos/react-ui-components`
already depends on `@dxos/assistant`), but it means the lower package is **not** AI-free; it is
**AI-loop-free**.

---

## 3. Where the layers sit today

```
@dxos/plugin-assistant        capabilities · operations · containers · processor (AI loop)
    ↓
@dxos/react-ui-chat           ChatEditor · ChatDialog · ChatStatus · ChatStatusIndicator
                              deps: react-ui, react-ui-components, react-ui-dnd, react-ui-editor,
                                    ui-editor, ui-theme, async, invariant, util
                              ↳ NO @dxos/echo, NO @dxos/types, NO @dxos/assistant*
@dxos/react-ui-markdown       MarkdownStream (typewriter, XML widget host) — deps include @dxos/echo
@dxos/ui-editor               xmlTags · XmlWidgetRegistry · XmlWidgetStateManager
```

Two findings:

1. **`react-ui-chat` is deliberately ECHO-free.** Its whole dependency set is presentational. Moving
   `Feed`/`Message`/`AiContext`-shaped components into it would be a layering regression, not a
   consolidation. It is the *editor-and-chrome* layer and should stay that.
2. **`react-ui-thread` already exists** for human comment threads (plugin-thread), and depends on
   `@dxos/echo` + `@dxos/types`. The word "thread" is therefore taken in this namespace — another
   reason to name the new package after the domain (`assistant`) rather than the shape (`thread`).

---

## 4. Proposal — `@dxos/react-ui-assistant`

A new package between `react-ui-chat` and `plugin-assistant`, depending on Feed/Message/Chat objects
but knowing nothing about the plugin system or the AI processing loop.

```
@dxos/plugin-assistant      capabilities · operations · containers · AiChatProcessor
                            (implements ChatProcessor; supplies Surface widget, voice actions,
                             toolbar operations, translations registration)
    ↓
@dxos/react-ui-assistant    Chat.Root/Content/Thread/Prompt/Minimap/Status/TaskList
                            MessageSyncer · BlockRenderer · componentRegistry · widgets
                            projectThread / resolveRewind (Feed lineage)
                            useSkills · useContextObjects · useFilteredTypes
                            ChatProcessor port + MockChatProcessor (scripted, no AI)
                            deps: react-ui-chat, react-ui-markdown, react-ui-components,
                                  react-ui-menu/list/search/tabs, ui-editor,
                                  echo, echo-react, types, assistant, assistant-toolkit
    ↓
@dxos/react-ui-chat         ChatEditor · ChatDialog · ChatStatus (unchanged, still ECHO-free)
```

### 4.1 What moves, what stays

**Moves** (~3,100 LOC + ~1,700 LOC of tests/stories that move with it):

- `components/Chat/*` (Root, Content, Thread, Prompt, Minimap, TaskList wrappers, context, events,
  `thread.ts` + `thread.test.ts`)
- `components/ChatThread/*` (ChatThread, `sync/`, `registry.tsx`, all widgets except `SurfaceWidget`)
- `components/ChatPrompt/*` except `ChatActions` and `useChatVoiceInput`
- `components/TaskList`
- `hooks/useChatKeymap`, `useSkillRegistry`, `useContextObjects`, `useContextBinder`,
  `useFilteredTypes`, `useReferencesProvider`, `useDebug`
- `types/Assistant.ts` (the `ChatView` enum), `types/AssistantPreset.ts` (prop types only)

**Stays in the plugin:**

- `capabilities/`, `operations/`, `containers/`, `skills/`, `templates/`, `execution-graph/`
- `processor/` — `AiChatProcessor` becomes the production implementation of the port
- `Chat.Toolbar` (or: moves as presentation, with the actions injected)
- `SurfaceWidget`, `ChatActions`, `useChatVoiceInput`
- `hooks/useChatProcessor`, `useChatServices`, `useSelectionContext`, `usePresets`,
  `useChatToolbarActions`, `useHomeSuggestions`, `useProcessEphemeralStatus`, `useTraceMessages`

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
   cheapest full-composite story boots ~10 plugins. DESIGN.md §2.5 names this exact gap: *"every
   UI-level iteration on chat behavior costs a live model round-trip"*. The scripted-model work
   (DESIGN.md §3.1) fixed determinism; it did not fix **cost of setup**.
3. **It is a precondition for the thread-tree work, not a detour.** The soft-fork model already sits
   at the right layer — `Feed.history` / `Feed.setParent` / `PARENT_KEY` in `@dxos/echo`, and
   `projectThread` / `resolveRewind` (87 LOC, pure, Feed-only) in `components/Chat/thread.ts`. A
   tree-of-threads UI is a projection over Feed lineage plus, later, over multiple Feeds. Building
   it inside a 20k-line plugin whose composite is welded to one processor instance is the harder
   path; building it against a Feed-shaped, processor-free package is the easier one. Multi-Feed
   spanning in particular wants a component that takes *feeds*, not a *chat with a processor*.
4. **Independent review and versioning.** Chat UI churn stops colliding with agent-loop churn.

Arguments against / real costs:

1. **The port is genuine design work, and it is the risky part.** It must expose atoms + commands +
   `AiContext.Binder` + `Registry` without dragging in Effect layers or capabilities. Done lazily it
   becomes a widened signature — which the repo's no-cast rule forbids — or it leaks the plugin back
   in through the type. Budget this as its own step with its own tests.
2. **Two slots must be introduced.** `componentRegistry` is currently a `const` value; it becomes
   `createComponentRegistry({ extensions })` so the plugin can contribute `SurfaceWidget`. `ChatPrompt`
   needs an actions slot so the plugin can contribute voice input. Slot indirection is where
   regressions hide — both need a story that renders *without* the extension and one *with* it.
3. **Translations split.** ~12 files use `meta.profile.key`. The package needs its own namespace and
   the plugin must register it (`react-ui-chat` and `react-ui-thread` both already do this, so the
   pattern is established, but every key moves once).
4. **Package overhead.** New moon project, storybook config, build/test targets, and `private: true`
   until a trusted publisher exists.
5. **Story migration is not free.** ~1,700 LOC of tests/stories move; the `ChatThread` and
   `MarkdownStream` stories depend on `#testing` (`test-generator.ts`) which itself uses
   `plugin-client/testing` and `plugin-testing` — those story harnesses either stay in the plugin or
   the generator is split into a plugin-free half.

**Rejected alternatives:**

1. **Move into `@dxos/react-ui-chat`.** Rejected — it would add `@dxos/echo`, `@dxos/types`,
   `@dxos/assistant`, `@dxos/assistant-toolkit` to a package that is currently purely
   presentational, and `plugin-thread`/others depend on that property.
2. **Reorganise in place (subpath exports only).** Cheapest, but buys nothing structural: the chat
   UI still cannot be rendered without the plugin's capability graph, which is the actual complaint.
3. **Do nothing until the thread-tree design settles.** Defensible, but the tree work will double
   the size of `components/Chat`, and moving 6k LOC is strictly harder than moving 3.6k.

### 4.3 Suggested sequencing

Each step is independently landable and testable.

1. **Design the `ChatProcessor` port** in the plugin (no move yet): an interface + `AiChatProcessor
   implements ChatProcessor` + a `MockChatProcessor` in `#testing`. Prove it by rewriting one story
   (`Chat/Error.stories.tsx`) against the mock. *Test: existing plugin tests + the rewritten story.*
2. **Move the leaf-most, cleanest subtree**: `ChatThread` + `sync/` + `registry.tsx` + widgets (minus
   `SurfaceWidget`), with `createComponentRegistry({ extensions })`. Its stories and its 451 LOC of
   sync tests move with it. *Test: `sync.test.ts`, `tool-widget-state.test.ts`, widget stories,
   `MarkdownStream.stories.tsx`.*
3. **Move `Chat` + `ChatPrompt` + `TaskList`** onto the port, with an actions slot; `ChatActions` and
   voice input stay behind and are injected by the plugin. *Test: `thread.test.ts`, `ChatOptions`
   story, plus a new composite story driven only by `MockChatProcessor`.*
4. **Repoint consumers**: plugin containers and `stories-assistant`. `ChatModule` imports
   `Chat`/`useChatProcessor` from two subpaths today; after the move it takes `Chat` from
   `@dxos/react-ui-assistant` and `useChatProcessor` from the plugin — a two-line change, and the
   right smoke test that the boundary is real. Per repo policy, **no compatibility re-exports**:
   every call site updates in the same change.
5. **Then** start the thread-tree work in the new package, where a scripted multi-branch Feed can be
   rendered without a model.

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

1. **Package name** — `@dxos/react-ui-assistant` (domain-named, avoids the overloaded "thread"), or
   something narrower like `@dxos/react-ui-conversation`?
2. **Port shape** — does the port expose `AiContext.Binder` and `Registry.Registry` directly
   (simple, but pins `@dxos/assistant` into the UI package), or narrow read-only views of them
   (cleaner boundary, more adapter code)?
3. **`Chat.Toolbar`** — move as presentation with injected `MenuActions`, or leave it in the plugin
   entirely? Leaving it means the package's composite story has no toolbar.
4. **Test-generator split** — does `testing/test-generator.ts` move (it needs a plugin-free half), or
   does the new package get a fresh Feed-shaped generator and the plugin keeps its own?
5. **Scope of step 5** — is the tree-of-threads model *within* one Feed (lineage / soft fork, which
   `Feed.history` already supports) settled enough to build, or does the multi-Feed case need a
   design pass first? Multi-Feed changes the component's input from `chat` to a set of feeds, and
   that decision should land before step 3 fixes the composite's props.
