# chat-ui — design

The engine spike and the retrofit it exists to justify. The engine's own design is in
[`react-ui-feed/DESIGN.md`](../../../packages/ui/react-ui-feed/DESIGN.md); the audit that motivates
the work is [`plugin-assistant/docs/AUDIT.md`](../../../packages/plugins/plugin-assistant/docs/AUDIT.md).

## The claim being tested

One virtualized list where **each message is its own markdown document**, against today's **one
document for the whole thread**. The deciding criterion is scroll smoothness, because that is the
thing a single-document thread is good at and the thing a virtualized list is most likely to be bad
at.

Six baselines now hold that criterion down, each verified by mutation rather than trusted because it
is green — construction cost, mount cost, fill stability, tail stability, navigation, and stability
while streaming. Two of them were caught measuring nothing before they were fixed, which is the
reason the mutation step is not optional.

## Retrofitting `plugin-assistant`

### What is actually being swapped

`ChatThread` is 151 lines that wire three things together:

| Today                                       | After                                                             |
| ------------------------------------------- | ----------------------------------------------------------------- |
| `MarkdownStream` — one document, one editor | `MessageList.Root` + `.Viewport` — one editor per message         |
| `MessageSyncer` — messages → document spans | _deleted_; the list is indexed by message, so spans are its range |
| `componentRegistry` + `createBlockRenderer` | `registry` prop + `chatRenderer` (both already exist in the feed) |

The syncer is the piece worth being explicit about: it exists **only** because a single document has
no notion of a message, so every consumer that wants one — the minimap, prompt navigation, rewind —
has to be handed a byte range. A list indexed by message has that natively, so `MessageSpan`,
`MessageThreadContext` and `applyToolBlockToWidgetState` go with it.

### Seam by seam

| `ChatThreadProps`                 | Replacement                                                          |
| --------------------------------- | -------------------------------------------------------------------- |
| `messages`                        | `MessageList.Root messages` — unchanged shape                        |
| `identity`                        | Chrome's, not the engine's: the avatar and name are per-row chrome   |
| `error`                           | A row like any other, or a sibling below the viewport                |
| `footer`                          | Sibling of `MessageList.Viewport` inside the panel                   |
| `extensions`                      | Item extensions — but see the caution below                          |
| `options.autoScroll`              | `stickyBottom` + `follow`                                            |
| `options.typewriter/cursor/fader` | Item-level, and only meaningful on the streaming row                 |
| `onSpans`                         | `useMessageList()` — `range`, `anchors`, `currentIndex`              |
| `MarkdownStreamController` ref    | `useMessageList()` — `scrollToIndex`, `scrollToBottom`, `stepAnchor` |

### Order, and why

1. **`ChatThread` behind the port first, unchanged.** Phase 2's `ChatProcessor` work is independent
   of the engine and lands first, so the retrofit is a swap of one component behind a stable
   interface rather than two changes at once.
2. **Replace the body, keep the props.** `ChatThread`'s signature is the contract its consumers hold;
   keeping it lets the swap be reverted by one file.
3. **Delete the syncer only once the consumers are on `useMessageList`.** `onSpans` has two readers
   (minimap, prompt nav) and they are the reason the syncer exists at all.
4. **Move the real widgets down last.** The feed's widgets are stand-ins. Tool state currently lives
   beside the document (`applyToolBlockToWidgetState`), and in a virtualized list a widget's state
   must survive its row unmounting — which is an open engine item, not a retrofit step.

### What blocks it today

- **Widget state does not survive virtualization.** An expanded panel scrolled out of the window
  comes back collapsed, because the open flag is React state inside the widget. The assistant's tool
  panels are exactly this. **This is the one hard blocker** — it must be fixed in the engine before
  the AI thread migrates, and it is why the AI thread is last in phase 4 rather than first.
- **`scrollPastEnd` is not stable** (opt-in, off by default). A chat wants it: without it the last
  messages can only ever be read at the foot of the screen.
- **Item extensions are not a prop.** `MarkdownItem` builds its own set, and it must keep building it
  once per configuration rather than per item — that is a 6× difference in mount cost, so any
  extension seam has to preserve the cache.

### What the retrofit gets in exchange

Virtualization the current thread does not have (its cost is O(thread), which is why the audit
started), per-message chrome without injecting widgets into markdown, and selection and search
answered from the model. Email, human chat, comments and transcription then follow the same path —
the point of the five-scenario exercise was that they differ only in a renderer and a chrome.
