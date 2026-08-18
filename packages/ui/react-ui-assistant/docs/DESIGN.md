# react-ui-assistant — design

The assistant chat surface as a public UI package: the `ChatThread`, its widgets, its chrome and
its renderer, built on `@dxos/react-ui-feed`. This document records the analysis of the component
it replaces — `plugin-assistant`'s `ChatThread` — and the plan that produced this package.

## 1. What the old ChatThread was

`plugin-assistant/src/components/ChatThread` rendered the entire conversation as **one CodeMirror
markdown document** (`MarkdownStream`, from `@dxos/react-ui-markdown`). Every message's blocks were
flattened to markdown text, non-prose blocks became XML tags (`<reasoning>`, `<toolCall>`,
`<prompt>`, …) that a widget registry replaced with DOM or portaled React components, and the
document only ever grew — streaming was literal text appended to the editor.

That architecture forced three pieces of machinery, each of which the feed engine dissolves:

### 1.1 `MessageSyncer` — the streaming reconciler

One document meant the messages array had to be diffed against what was already on screen. The
syncer kept a cursor of flat-block indices (`_completed`), a partial-block char count
(`_trailing`), and a thread-identity sentinel; every update either appended the rendered suffix or
detected a rewind/switch and rebuilt the document. Its correctness leaned on a fragile contract:
the renderer's output for a streaming block had to be **monotonically string-extending** — a
single non-append (a list marker collapsing, a paragraph break normalizing) broke incremental
sync. Tool widget props could not live in the document at all, so a parallel channel
(`applyToolBlockToWidgetState` / `rehydrateToolWidgetsFromMessages`) mirrored tool blocks into
CodeMirror widget state and re-applied them after every document replace.

**Now:** the feed's `ListModel` is _told_ what changed (`{prepended, appended, updated}` — SPEC
F-7.1), each message is its own item, and a streaming message reconciles by document delta inside
its own item. The host-side residue of the syncer is one hook: `useFeedModel(messages)` folds the
re-created array into a stable model (`replace` — the one place identity inference survives), and
`model.setStreaming(id)` marks the tail. There is no cursor, no monotonicity contract, no
rehydration pass: tool state rides in the tag attributes and widget-state store, which are rebuilt
from the message itself whenever the item mounts.

### 1.2 `MarkdownStreamController` — the external-control surface

The controller was the document's imperative API, and `Chat.tsx` (the plugin's composite root)
drove the thread through it: `scrollToBottom` on submit/error, `scrollTo(charOffset)` for
prompt-to-prompt navigation, `getVisibleRange`/`onVisibleRangeChange` for the outline rail, and
`setContext`/`updateWidget` for the widget side-channel. Positions were **character offsets** into
the one document, so `ChatThread` also published `MessageSpan[]` (per-message offset ranges,
computed during the syncer's walk) for the outline and prompt navigation to consume.

**Now:** positions are **message indices**, and the feed already owns every control the
controller exposed: `useMessageList()` provides `scrollToBottom`/`scrollToIndex` and the
`navigation` seam (stops from the model's `'prompt'` policy — the same seam the toolbar, arrow
keys and rails share), and the mounted range replaces `getVisibleRange`. The equivalent
abstraction is deliberately thin: `ChatThread` forwards a `ChatThreadController` ref
(`{ model, scrollToBottom, scrollToIndex, navigation }`) so a host that composes the thread
without the feed's context parts (as `Chat.tsx` does for submit/nav events) keeps one imperative
handle. Spans, `onSpans`, `buildMarkers`'s offset arithmetic and the epsilon scroll comparisons
are all deleted — outline markers are built from `model.stops()` directly.

### 1.3 `registry.tsx` + `createBlockRenderer` — projection

The renderer flattened blocks to markdown-with-tags and filtered by view type (`summary` /
`normal` / `thinking` / `debug`); the registry mapped tags to widgets. Both survive nearly
unchanged — they were always the durable part — but move here, with two corrections:

- The feed's renderer contract (`MessageRenderer: message → ItemContent`) is per-message, not
  per-block-with-context: `createRenderer(viewType)` returns one. Pending blocks emit **unclosed
  tags** (the feed's streaming convention) instead of the syncer's monotonicity dance.
- The registry is **extensible by the host**. `SurfaceWidget` renders an app-framework `Surface`,
  which a UI-layer package must not depend on — the plugin keeps that widget and passes it in
  (`registry={{ ...assistantRegistry, surface: … }}`).

## 2. What moves where

| plugin-assistant (old)                          | destination                                                   |
| ----------------------------------------------- | ------------------------------------------------------------- |
| `ChatThread/ChatThread.tsx` (MarkdownStream)    | rewritten: `react-ui-assistant` `ChatThread` on `MessageList` |
| `ChatThread/sync/*` (MessageSyncer, tool state) | deleted — `useFeedModel` + per-item reconciliation            |
| `ChatThread/registry.tsx`                       | `react-ui-assistant` `registry.tsx` + `renderer.ts`           |
| `ChatThread/widgets/*` (except SurfaceWidget)   | `react-ui-assistant` `components/widgets/`                    |
| `ChatThread/widgets/SurfaceWidget`              | stays in plugin; injected into the registry                   |
| `Chat.tsx` `buildMarkers` / spans / nav offsets | deleted — `model.stops()` + index navigation                  |
| `Chat.Thread` / `Chat.Outline` internals        | inlined in `Chat.tsx` over `react-ui-assistant`               |
| `testing/test-generator.ts`                     | `react-ui-assistant/testing`                                  |
| `react-ui-feed` `stories/assistant.stories.tsx` | retired — `ChatThread.stories.tsx` here is canonical          |
| `react-ui-feed/testing` `AssistantChrome`       | `react-ui-assistant` `MessageChrome` + toolbars               |
| view type (`Assistant.ChatView`)                | `ChatView` defined here; plugin settings reference it         |

The prompt bubble and the two hover toolbars (`Prompt`: copy / rewind / fork / index / time;
`Assistant`: copy / reply / index / time) graduate from the feed's testing scenarios into real
components — always in flow, revealed by opacity, so chrome never changes a row's measured height.

## 3. Streaming, precisely

The plugin's message pipeline is unchanged: `projectThread` merges the durable feed query with the
processor's pending messages into one array per render. The thread consumes it as:

```tsx
const model = useFeedModel(messages, { stops: 'prompt' });
const streaming = useAtomValue(processor.streaming);
useEffect(() => model.setStreaming(streaming ? tailAssistantId(messages) : undefined), [...]);
```

Each `replace` publishes; mounted items re-render; the streaming item appends the delta to its own
document (the feed's `MarkdownBlock` reconciliation); the follow keeps the tail at rest only while
content arrives _and_ the reader is pinned there. Rewind is `replace` shrinking the array — the
identity scan sees the truncation and the window is told, nothing rebuilt by hand.

## 4. Package shape

```text
react-ui-assistant/
  src/
    components/
      ChatThread/       ChatThread.tsx (+ canonical ChatThread.stories.tsx)
      MessageChrome/    MessageChrome.tsx — bubble + Prompt/Assistant toolbars
      widgets/          ported widgets (Reasoning, Status, Tool, Summary, …)
    renderer.ts         view-type projection (+ estimateRow)
    types.ts            ChatView, ChatThreadEvent
    registry.tsx        assistantRegistry (host-extensible)
    translations.ts
    testing/            test-generator (moved), fixtures
  exports: "."  "./testing"
```

Dependencies: `react-ui-feed` (list, model, follow via `react-ui-virtual`), `react-ui`,
`ui-editor` (widget registry types), `react-ui-components`, `types`; `echo` +
`react-ui-markdown` for `/testing` (the generator writes ECHO feeds). No `app-framework`.

`react-ui-virtual` is the same split one layer down: the anchor-relative placement, `useWindow` /
`Window`, and the follow aspect (`useFollow`, `ScrollFollower`) — the parts with no notion of a
message — extracted from `react-ui-feed`, which now depends on it.
