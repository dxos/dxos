# CRX Page Actions — Design

Date: 2026-06-09
Status: Approved (brainstorming complete)

## Summary

An extension mechanism for `composer-crx` whereby Composer plugins register **page actions** —
serializable operation descriptors that the Chrome extension surfaces in its popup toolbar menu and
the page context menu. Invoking an action captures inputs from the current page via a bundled
extractor and delivers a transport-agnostic `OperationRequest` to Composer, where `plugin-crx`
routes it to the target operation via `OperationInvoker`. Responses may carry serialized card data
rendered generically in the popup.

A new, deliberately simple `plugin-bookmarks` is built alongside as the first consumer.

## Decisions (scope dialogue)

1. **Execution locus — no standalone (phase 1).** The CRX does not host a plugin runtime or DXOS
   client. It auto-opens/focuses a Composer tab when needed and RPCs over the existing bridge.
   Two invariants keep a future "full peer" migration to a transport swap:
   - The action registry is **serializable descriptors cached extension-side**
     (`chrome.storage.local`) — required anyway because `chrome.contextMenus` must be registered
     before any tab exists. A future peer fills the same cache from replicated ECHO objects.
   - Invocation is a **serializable request/ack envelope** (like the existing Clip envelope). A
     future peer delivers it to an embedded runtime or writes it into ECHO instead of the bridge.
   - All descriptor evaluation (URL matching, menu construction, predicates) runs extension-side
     against the cache — never delegated to the live tab.
2. **MV3 constraint.** Dynamically-installed plugins contribute *data only* (descriptors). Code
   that runs in extension contexts (extractors, predicate evaluation, generic card rendering) is
   bundled into the CRX at build time.
3. **Context matching.** URL match patterns are the primary gate (`documentUrlPatterns` natively
   on context menus; same patterns evaluated by the background for the popup). Descriptors may add
   a lazy declarative DOM predicate (`{ exists: selector }`) evaluated only at popup-open and
   invoke time — never continuously. Predicate failure at invoke → "not applicable" feedback.
4. **Input capture.** Named **built-in extractors** bundled in the CRX, `snapshot` by default.
   A declarative extraction DSL is explicitly out of scope; it slots in later as one more extractor
   (`name: 'dsl'`, selectors in `params`) with no changes to descriptors, envelope, or registry.
5. **Related data display.** Phase 1 renders serialized card data generically in the popup
   (title, subtitle, image, fields, open-in-Composer link). Real Surface rendering is a future
   full-peer upgrade; the generic card remains the fallback.
6. **Driving use cases.** Bookmarks → commerce → video → inbox (see Milestones).

## Architecture

```
plugin (descriptor) → plugin-crx registry → bridge → CRX cache (chrome.storage.local)
user clicks action → extractor runs in page → OperationRequest → bridge → plugin-crx
  → OperationInvoker → ack (+ optional card) → popup toast / generic card
```

### Descriptor & registration (plugin-crx)

New capability `CrxCapabilities.PageAction` in `packages/plugins/plugin-crx`. Not app-graph:
app-graph actions carry closures; these must cross a process boundary as data.

```ts
type PageActionDescriptor = {
  id: string;                      // 'dxos.org/plugin/commerce/page-action/configure-provider'
  label: string;                   // resolved (translated) Composer-side before sync
  icon: string;                    // ph icon name
  urlPatterns: string[];           // Chrome match patterns
  predicate?: { exists: string };  // lazy DOM condition
  extractor: string | { name: string; params?: unknown };  // default 'snapshot'
  operation: string;               // DXN of the operation to invoke
  contexts: ('popup' | 'page' | 'selection' | 'link')[];
};
```

Convention: the target operation is a plugin-defined wrapper (e.g.
`BookmarkOperation.AddFromSnapshot`) whose input schema is composed from the extractor's output
schema — input mapping stays in plugin code, Composer-side. Space resolution = active space, as
with clips today.

### Registry sync (bridge)

`plugin-crx` aggregates contributed descriptors and answers a `composer-crx:actions:list` request
over the existing bridge (same pattern as the search-proxy ping). The CRX refreshes its cache on
bridge handshake and extension startup, then (re)builds `chrome.contextMenus` entries with native
`documentUrlPatterns`.

### Extension side (composer-crx)

- **Background**: owns the cache, context menus, and invocation. Context-menu click → content
  script runs the extractor → build `OperationRequest` → route to best Composer tab (existing
  scoring), auto-open one if none → ack → `chrome.notifications` on failure.
- **Popup toolbar menu**: filters cache by current tab URL, fires lazy predicate checks via the
  content script, renders enabled actions. Ack toast inline; card payload rendered as a generic
  read-only card.
- **Content script additions**: `runExtractor` and `checkPredicate` message handlers.

### Envelope

```ts
type OperationRequest = {
  version: 1;
  id: string;
  actionId: string;
  operation: string;
  page: { url: string; title: string; favicon?: string };
  inputs: unknown;                 // extractor output
  invokedFrom: 'popup' | 'contextMenu';
};

type OperationAck =
  | { ok: true; id: string; card?: SerializedCard }
  | { ok: false; id: string; error:
      | 'unsupportedVersion' | 'unknownAction' | 'notApplicable'
      | 'extractorFailed' | 'noSpace' | 'operationFailed' | 'timeout' };
```

```ts
type SerializedCard = {
  title: string;
  subtitle?: string;
  image?: string;                  // URL
  fields?: { label: string; value: string }[];
  link?: string;                   // open-in-Composer URL
};
```

Mirrors the Clip envelope (versioned, stable error codes). `plugin-crx` installs an action
listener alongside the existing clip listener.

### Extractor abstraction (composer-crx)

```ts
// composer-crx/src/extractors/
type ExtractorContext = {
  document: Document;
  selection?: Selection;
  menuInfo?: { linkUrl?: string; srcUrl?: string };  // from contextMenus click
  params?: unknown;                                  // descriptor-supplied
};

type Extractor<T> = {
  name: string;                       // key referenced by descriptors
  outputSchema: Schema.Schema<T>;     // validated before the envelope ships
  paramsSchema?: Schema.Schema<any>;
  run: (context: ExtractorContext) => Promise<T>;    // executes in content-script world
};
```

- Registry (`extractors/index.ts`) keyed by name; content script dispatches through it. Adding an
  extractor = one file + registry entry.
- Shared DOM helpers (og/JSON-LD/h1 harvesting, HTML truncation) factored out of the current clip
  capture; `snapshot` becomes the first registered extractor.
- Output schemas double as the contract: the Composer-side wrapper operation's input schema is
  composed from the same schema. Schemas live with the envelope types, shared between
  `composer-crx` and `plugin-crx` the same way Clip types are handled today.

Built-ins:
- `snapshot` — url/title/selection/truncated HTML/hints (og, JSON-LD, h1); the Clip capture,
  generalized.
- `youtube-video` — video id, title, description, transcript via in-page fetch (M3).
- `email-message` — Gmail DOM parse: sender name/email, subject (M4).

### plugin-bookmarks (new package, `private: true`)

Deliberately simple first consumer; existing UI components only.

- **Schema**: `Bookmark` — `url`, `title`, `favicon?`, `image?` (og), `excerpt?` (og description /
  first lines), `summary?`, `createdAt`. Flat objects in the space; no collection type initially.
- **UI**: `Card` surface for Bookmark; `Article` surface rendering the queried list
  (Panel + ScrollArea + List pattern).
- **Page action**: "Add bookmark", all http(s) URLs, `snapshot` extractor,
  contexts `['popup', 'page']`, operation `BookmarkOperation.AddFromSnapshot`.
- **Operations**: `AddFromSnapshot` (snapshot → Bookmark in active space); `Summarize` (separate,
  best-effort via assistant when available — initial fallback is og-description as excerpt; AI
  summary is not load-bearing).

## Milestones

- **M1 (bookmarks)**: descriptor capability + bridge sync + popup menu + `snapshot` extractor +
  plugin-bookmarks (schema, surfaces, `AddFromSnapshot`). Smallest full-pipe proof.
- **M2 (commerce)**: `ConfigureProviderFromSnapshot` replaces the copy-URL flow; context menus
  land here.
- **M3 (video)**: `youtube-video` extractor; `AddVideoFromPage` in plugin-video.
- **M4 (inbox)**: card payload in ack + generic popup card + `email-message` extractor;
  bookmarks `Summarize` via assistant rides along.

## Error handling

Stable error codes in the ack (above). Popup: inline toast. Context menu: `chrome.notifications`
on failure. `noComposerTab` is handled by auto-open, not surfaced. Predicate failure at invoke →
`notApplicable` toast.

## Testing

- Descriptor/envelope schemas: unit tests.
- Extractors: factored as pure DOM functions, tested against fixture HTML.
- plugin-crx action listener: TestLayer + stub invoker, as the clip listener is tested today.
- plugin-bookmarks operations: TestLayer.
- Manual e2e per milestone via the CRX dev build.

## Implementation notes

- Use the `composer-plugins` skill (with `composer-ui` for surfaces) when building
  plugin-bookmarks and modifying plugin-crx; use the `operations` skill for operation
  definitions/handlers.
- New package must be `private: true`; workspace deps as `workspace:*`.
