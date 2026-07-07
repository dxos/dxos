# Composer CRX — `core/`

Extension-side logic shared by the three runtime contexts — the **background** service worker, the
**content script** (injected into every page), and the **side panel** UI. Each subfolder is a
self-contained module exported via its `index.ts`.

| Folder        | Module          | Responsibility                                                |
| ------------- | --------------- | ------------------------------------------------------------- |
| `/actions`    | Page actions    | Page-action registry, matching, and invoke/run/deliver flows. |
| `/bridge`     | Composer bridge | Composer tab discovery and the configured Composer origins.   |
| `/extractors` | Page extractors | Turns the current page into a serializable `Snapshot`.        |
| `/image`      | Thumbnails      | Image/thumbnail action backed by the EDGE image service.      |
| `/picker`     | Element picker  | In-page DOM element picker.                                   |
| `/proxy`      | Search proxy    | Enables Composer to search the web via the extension.         |

## Page actions

- **Purpose** — the page-action system: actions contributed by Composer plugins, matched to the current page and invoked on the user's behalf.
- **Functionality** — a cached list of serializable `PageActionDescriptor`s (id, label, icon, URL patterns, optional DOM predicate, extractor, operation); URL/context filtering (`getActionsForUrl`, `matchesUrlPatterns`); the `run` flow (`runPageAction`: extract page inputs, then invoke the descriptor's operation in Composer) and the `deliver` flow (`deliverPickedSnapshot`: send a picker snapshot, enriched with a thumbnail, to Composer).
- **Lifecycle** — driven by the content script announcing readiness, never by proactive probing. A Composer page's content script fires `PAGE_ACTIONS_READY`; the background refreshes the registry from that known-connected tab (`refreshRegistry`) and caches it. The panel reads the cache to render its toolbar; run/deliver requests originate from the panel/picker and are fulfilled by the background.
- **Protocol / integration** — runtime messages keyed by the `PAGE_ACTION(S)_*_MESSAGE_TYPE` discriminators (`READY`, `LIST`, `RUN`, `DELIVER`, `EXTRACT`, `PREDICATE`); the background relays `LIST`/`INVOKE` to the Composer page as `PAGE_ACTIONS_*_EVENT` CustomEvents. Uses `bridge/` to find the Composer tab, `extractors/` to gather inputs, and produces the `Snapshot` type consumed by `picker/` and `extractors/`. All inbound payloads cross a trust boundary and are validated via the `decode*` guards.
- **State** — the registry is persisted in `browser.storage.local` under `PAGE_ACTIONS_STORAGE_KEY` (survives service-worker suspension); everything else is stateless request handling.

## Composer bridge

- **Purpose** — locate and reach the Composer app, and own the user-configurable list of Composer origins.
- **Functionality** — `findComposerTab` (query tabs matching the configured patterns and pick the best-scored one), `focusOrOpenComposerTab` / `openComposerTab`, and origin helpers `isComposerUrl` / `matchesPattern` (a small chrome match-pattern implementation).
- **Lifecycle** — pure on-demand calls; no background listeners of its own. Invoked when the user launches Composer, when the registry refreshes, when the proxy origin-guards a sender, and when the picker resolves actions.
- **Protocol / integration** — wraps `browser.tabs` / `browser.windows`; consumed by `actions/`, `proxy/` (origin guard), and the panel/background (launch button, `open-composer`).
- **State** — the configured origins are read/written via `getComposerUrls`/`setComposerUrls` (a `state/` `ComposerUrls` entry over `browser.storage.sync`, default `DEFAULT_COMPOSER_URLS`); `sender.ts` keeps an in-memory `lastUsedTabId` to bias tab scoring.

## Page extractors

- **Purpose** — turn the current page into the serializable `Snapshot` an action operation consumes.
- **Functionality** — the default `snapshotExtractor` (source metadata, og/JSON-LD hints, current text selection, and document HTML truncated at `MAX_HTML_LENGTH`), plus `runExtractor(name, ctx)` which dispatches to a bundled extractor by name.
- **Lifecycle** — runs in the content script's page world, on demand, when the background asks for inputs during `runPageAction` (the `EXTRACT` message).
- **Protocol / integration** — extractors are referenced _by name_ from action descriptors (`actions/`); their output is validated Composer-side by the target operation's input schema. Reuses `picker/harvest` for favicon/hints. Deliberately imports `actions/` and `picker/` submodules (not their barrels) to stay free of `webextension-polyfill`, since it runs in page/node contexts.
- **State** — stateless; a static set of extractors keyed by name.

## Thumbnails

- **Purpose** — the single image/thumbnail action (formerly the generic `actions/`).
- **Functionality** — `createThumbnail(imageUrl)`: fetch the image, normalize its content-type, upload it to the EDGE image service, and persist the hosted URL.
- **Lifecycle** — triggered from the background's `Create Thumbnail…` context-menu handler; the side panel is opened in the same gesture and shows the result.
- **Protocol / integration** — uses `EdgeServiceClient` / `Image.thumbnail` (`@dxos/edge-client`); writes the hosted URL via the `state/` `ThumbnailUrl` entry (`browser.storage.local`), which the panel observes via `ThumbnailUrl.subscribe`.
- **State** — writes the hosted-URL result to `storage.local`; sets a transient error/success badge on the toolbar action; otherwise stateless.

## Element picker

- **Purpose** — let the user pick a page element interactively and clip it as a `Snapshot`.
- **Functionality** — `startPicker` renders a full-viewport overlay (hover outline + a floating toolbar of the applicable actions, Esc to cancel) and resolves with the chosen element and action id; `pickSnapshot` orchestrates picker → harvest → snapshot; `harvest*` pulls favicon/hints/selection; `showPickerNotice` shows a transient in-page toast; `showDebugPreview` is a developer-mode snapshot inspector.
- **Lifecycle** — invoked in the content script when the panel fires `start-picker`. The overlay is created on demand and fully torn down on pick/cancel; the resulting snapshot is handed to the background for delivery.
- **Protocol / integration** — panel → content `start-picker` (webext-bridge, fire-and-forget); resolves picker-context actions via `actions/getActionsForUrl(url, 'picker')`; delivers the result to the background via the `actions/` deliver message. Icons resolve from the extension-packaged `icons.svg`.
- **State** — no persistent state; a transient DOM overlay host only (`__resetPickerForTests` clears it in tests).

## Render proxy

- **Purpose** — fetch/render arbitrary pages on Composer's behalf, using the extension's cross-origin privilege to bypass page CORS, and answer a liveness ping.
- **Functionality** — `installSearchProxy` registers the background listeners; `renderUrl` opens an unfocused popup window, waits for load, injects a reader to capture `{ html, finalUrl }`, then removes the window (`DEFAULT_RENDER_TIMEOUT_MS` bounds the wait). An unfocused window (rather than a background tab) keeps `visibilityState: 'visible'` so anti-bot checks pass.
- **Lifecycle** — the background registers the listeners once at startup; each request spins up and tears down a throwaway render window.
- **Protocol / integration** — a Composer page dispatches `RENDER_EVENT` / `PING_EVENT` CustomEvents; the content-script relay forwards them as `RENDER`/`PING` runtime messages and re-emits the decoded acks back as `*_ACK_EVENT`. The background **origin-guards** every request against `bridge/isComposerUrl` before acting; payloads are validated via `decode*`.
- **State** — stateless per request; the only ephemeral resource is the render window it creates and removes.
