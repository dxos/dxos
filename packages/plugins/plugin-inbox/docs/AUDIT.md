# plugin-inbox — decomposition audit

_Analysis of how `@dxos/plugin-inbox` could be split into focused domain plugins
(Mail / Calendar / Contacts), provider plugins (Google, JMAP, …) owning the
`./apis` wrappers, and a shared card-focused `react-ui-card` UI package._

> Scope: architecture only. A narrower component-level audit (message-header
> divergence) lives in [`src/components/AUDIT.md`](../src/components/AUDIT.md).

---

## Plan (roadmap)

The end-state topology and its rationale are in §4–§5; the seams to cut are in §3.
Each step below is independently landable + testable, and links to the section that
details it.

1. ✅ **Rename `GooglePeople` → `GoogleContacts`** — pure rename, no move. _(Done —
   PR #12300.)_
2. ~~**Extract `apis/` → `@dxos/google-apis` + `@dxos/jmap-apis`**~~ — **folded into
   step 4** (§8h D1): the wrappers move into the provider plugin as a framework-free
   `src/apis/` subtree instead of standing up two extra packages, and graduate to their
   own package only when a non-plugin consumer appears.
3. ✅ **Extract `@dxos/react-ui-card`** — shared low-level card vocabulary `Row` +
   `CardTile` + `Avatar`, avatar/hue unified (§4c). _(Done — PR #12300; `ViewMode` +
   `Toolbar` → `@dxos/react-ui-menu` still to follow, §4d.)_
4. **Split the headless provider plugins — `@dxos/plugin-google` / `@dxos/plugin-jmap`**
   (§7 for the seam analysis, **§8 for the target folder structure + landable steps**).
   Pure sync/connector logic (no UI); extract as leaf plugins depending only on
   plugin-inbox. Defer the connector-id inversion (providers import ids from
   plugin-inbox `constants.ts`). See §7 for upstream deps + the three ownership
   decisions this defers.
5. ✅ **Hoist shared sync infra to `@dxos/plugin-connector`** (§3.7) — already done before this
   pass: `findBindingForTarget` / `createSyncRoutine` / `syncTarget` all live in
   `plugin-connector/src/util/` and are re-exported from its root.
6. ✅ **Invert the connector-id coupling** (§3.1) — `ConnectorSync` gains `targetTypename`, each
   provider declares what it binds, and `connectorIdsForTarget` resolves a bindable type's providers
   from the registry. `types/Mailbox|Calendar` name none, and the duplicated ids are deleted.
7. **Move Calendar out → `@dxos/plugin-calendar`** (§4a). Repoint `plugin-google`'s
   calendar dep from plugin-inbox to plugin-calendar; update the ~4 `Calendar`
   consumers.
8. **Move Contacts out → `@dxos/plugin-contacts`** (§4a).
9. **`plugin-inbox` remains the Mail plugin** — keeps `Mailbox`, message UI, the AI
   layer, mail sync. `Mailbox`/`InboxOperation`/`InboxSkill` consumers are unaffected;
   only `Calendar`/`Contacts` importers repoint (no shims).

Each new package is `"private": true`, `workspace:*` for in-repo deps (`workspace:^`
for peers), per repo non-negotiables. Decisions + open questions: §6.

---

## 1. Current shape

`plugin-inbox` is one plugin covering **three domains** (mail, calendar,
contacts) across **two providers** (Google, JMAP), plus the AI extraction /
draft layer. Rough size by area:

| Area               | LOC   | What it is                                                         |
| ------------------ | ----- | ------------------------------------------------------------------ |
| `operations/`      | ~9100 | mail/calendar/contacts sync + send + extractor + analyze ops       |
| `components/`      | ~5500 | presentational React (Message/Event stacks, tiles, viewers, rows)  |
| `containers/`      | ~3300 | surface-bound articles/cards (Mailbox, Calendar, Event, Message)   |
| `apis/`            | ~2400 | raw provider wrappers: `google/{Mail,Calendar,Contacts}`, `jmap/*` |
| `types/`           | ~1700 | `Mailbox`, `Calendar`, schemas, `SystemTags`, `Settings`           |
| `capabilities/`    | ~1500 | plugin wiring (surfaces, graph, connectors, skills, settings)      |
| `util/` + `hooks/` | ~1900 | sync routine, match-filter, mailbox-sync, React hooks              |
| `services/`        | ~700  | Effect services wrapping the api wrappers (swappable for tests)    |
| `extensions/`      | ~550  | CodeMirror email-rendering extensions                              |
| `skills/`          | ~140  | inbox / inbox-send / calendar assistant skills                     |

**Consumers** (17 packages import `@dxos/plugin-inbox`) pull mostly types:
`Mailbox` (28×), `InboxOperation` (6×), `Calendar` (4×), `ExtractedFrom` (3×),
skills/capabilities (few). This matters — a split must preserve those import
points or update all call sites (no shims, per repo rule).

## 2. What is already decoupled (the good news)

The hard seams already exist; this is a lift, not a redesign.

1. **Domain object schemas are already shared.** `Message`, `DraftMessage`,
   `Event`, `Person`, `Organization` live in **`@dxos/types`** (`packages/sdk/types`),
   not here. Only the _container_ types (`Mailbox`, `Calendar`) are local. So
   Mail/Calendar/Contacts plugins would share the same object vocabulary with no
   new shared-types package.
2. **Provider sync is already provider-agnostic.** `operations/mail/mail-sync.ts`
   is a provider-neutral harness driven by a `MailSyncProvider` Effect service;
   `mail/google/` and `mail/jmap/` are just provider layers + mappers. Same
   pattern for `services/*-mail-api.ts` (swappable `Live` vs mock).
3. **The connector contract is external.** `@dxos/plugin-connector` owns
   `Connector`, OAuth, cursors, `ConnectorAuthAnnotation`. Provider plugins would
   each contribute their own `Connector[]` (today all four are registered in one
   `capabilities/connector.ts`).
4. **Calendar UI is already partly extracted** — `@dxos/react-ui-calendar` exists
   and is a dependency. There is precedent + a home for shared inbox UI.
5. **Email parsing is shared** — `@dxos/pipeline-email` (`EmailStage`) and
   `@dxos/extractor` already sit outside the plugin.

## 3. Coupling that resists a split (the seams to cut)

1. ✅ **`constants.ts` is a cross-domain hub — RESOLVED.** Connector ids were imported by
   `types/Mailbox.ts` and `types/Calendar.ts` via `ConnectorAuthAnnotation`, so the domain schema
   named its providers. Now inverted, reusing a pattern `plugin-studio` and `plugin-blogger` already
   used: `ConnectorAuthAnnotation.connectorIds` accepts a **resolver**, not just a literal array.
   `ConnectorSync` gained `targetTypename`; each provider declares the local type it binds; and
   `connectorIdsForTarget` (in `plugin-connector`) resolves a type's providers from the `Connector`
   registry. Both annotations now read
   `ConnectorAuthAnnotation.set({ connectorIds: connectorIdsForTarget, bindTarget: true })`, and the
   three duplicated ids are gone from plugin-inbox. Registering a provider is now the _only_ step —
   no edit to the type it binds, and a third-party provider can bind `Mailbox` without plugin-inbox
   knowing it exists.

   `GOOGLE_INTEGRATION_SOURCE` still remains, read by `types/DraftEvent.ts` to distinguish a local
   draft event from a synced one. It is a foreign-key source, not a connector id, so it has no
   registry to resolve through — a separate (smaller) inversion if it is ever worth doing.

2. **`react-surface.tsx` mixes all domains** in one capability module — mailbox,
   message, calendar, event, subscriptions, contact/org "related" surfaces.
   Splits cleanly by surface id, but it's one file today.
3. **`app-graph-builder.ts` (~640 LOC) mixes mail + calendar nodes.** The
   `createFeedObjectNodeExtension` helper is shared by both; a Mail/Calendar split
   must either duplicate it or promote it to a shared util.
4. **`InboxOperationHandlerSet` is one flat registry** (operations/index.ts) —
   trivially partitionable by the `mail/`, `calendar/`, `contacts/` dirs that
   already exist.
5. **`apis/` has plugin-independent code but sits inside the plugin.** The README
   already states the intent: _"should not depend on framework types or
   utilities … may leverage third-party packages."_ These are the cleanest
   extraction candidates.
6. **`services/` bridges `apis/` → Effect/`@dxos/compute`.** They import the
   plugin's `apis` and `errors`. On a provider-plugin split these move _with_ the
   provider.
7. **`util/` is mostly mail, but hides shared sync-target infrastructure.**
   `util.ts` (message formatting), `mailbox-sync.ts`, `match-filter.ts` are cleanly
   mail and stay. But `find-binding.ts` (`findBindingForTarget`),
   `sync-routine.ts` (`createSyncRoutine`), `sync-target.ts` (`syncTarget`) operate
   on **any** sync target — their own docs say _"the given object (mailbox,
   calendar, …)"_ — dealing with `Cursor` / `Connection` / `Routine` / timer-trigger
   plumbing, consumed by `capabilities/connector.ts` and `app-graph-builder.ts` for
   both mailbox and calendar sync (and the provider plugins will need them too).
   They belong to no single domain; promote the three to **`@dxos/plugin-connector`**
   (which already owns `Cursor` / `Connection` / `ConnectorAuthAnnotation` /
   bindings), else calendar/contacts would depend on plugin-inbox just for sync
   plumbing — the same plugin→plugin coupling `react-ui-card` avoids.

## 4. Proposed target topology

**Decisions (2026-07-21):** `plugin-inbox` **stays and is the Mail plugin** — no
rename to `plugin-mail`, no meta-plugin. We move **Calendar** and **Contacts**
_out_ into their own plugins (`plugin-calendar`, `plugin-contacts`). The AI layer
(extractor / analyze / draft) **stays in plugin-inbox**. Mail and calendar each
keep their own high-level components; only the genuinely-shared low-level
primitives are extracted (see §4c). The provider axis (Google / JMAP + `apis/`)
is unchanged from the original proposal below.

Two orthogonal axes: **domain** (what the object is) and **provider** (where it
syncs from). Keep them orthogonal.

```
                       @dxos/types (Message, Event, Person, …)   ← already shared
                                    ▲
        ┌───────────────────────────┼───────────────────────────┐
   domain plugins                                           provider plugins
   ─────────────                                            ────────────────
   @dxos/plugin-inbox (mail) ─┐                             @dxos/google-apis      (was apis/google)
   @dxos/plugin-calendar      ├─ depend on ─► provider ◄──  @dxos/plugin-google   (connector+services+sync ops)
   @dxos/plugin-contacts     ─┘   registry                  @dxos/jmap-apis        (was apis/jmap)
                                                            @dxos/plugin-jmap     (connector+services+sync ops)
        │
        └── shared low-level primitives ─►  @dxos/react-ui-card  (Row, CardTile, Avatar)
```

### 4a. Domain plugins

- **`@dxos/plugin-inbox` (Mail — stays)** — `Mailbox` type, mailbox/message/
  subscriptions surfaces + containers (`MailboxArticle`, `MessageArticle`,
  `MessageCard`, `SubscriptionsArticle`, `EditMessageArticle`), mail graph nodes,
  mail skills (`inbox`, `inbox-send`), **the AI layer** (extractor / analyze /
  draft ops), mail settings, mail-only components (`InboxStack`,
  `ConversationStack`, `HtmlViewer`, `EditMessage`, email `extensions/`). Owns the
  provider-agnostic `mail-sync.ts` harness + `MailSyncProvider` contract.
- **`@dxos/plugin-calendar`** — `Calendar` type, calendar/event surfaces +
  containers (`CalendarArticle`, `EventArticle`, `EventCard`,
  `CalendarProperties`), calendar graph nodes, `calendar` skill, draft-event ops,
  calendar-only components (`EventStack`, `Event/*`). Consumes
  `@dxos/react-ui-calendar` for the grid and `@dxos/react-ui-card` for the shared
  primitives (`Row`, `CardTile`, `Avatar`).
- **`@dxos/plugin-contacts`** — its own plugin (**decided**). Targetless: sync
  writes `Person` objects straight to the space, with `RelatedToContact` /
  `RelatedToOrganization` "related" surfaces + `useActorContact`. Thin, but stands
  alone so mail/calendar need not carry contact wiring. Provider sync
  (`contacts/google/*`) moves to `plugin-google` (§4b).

### 4b. Provider plugins (own `./apis` + connector + services + sync ops)

- **`@dxos/plugin-google`** — contributes the Gmail, Google Calendar, Google
  Contacts `Connector`s; owns `services/google-*`, `operations/{mail,calendar,contacts}/google/*`
  (sync/mapper/materialize/send). Depends on the domain plugins for their sync
  provider contracts + target schemas.
- **`@dxos/plugin-jmap`** — the JMAP mail connector, `services/jmap-*`,
  `operations/mail/jmap/*`, `jmapCredentialForm`.
- **`@dxos/google-apis` / `@dxos/jmap-apis`** — the raw wrappers from `apis/`,
  **framework-free** (no `@dxos/app-framework`, no plugin deps) as the README
  already intends. Provider plugins depend on these; they could later be replaced
  by third-party SDKs. (Naming: could be `@dxos/api-google`; **Open question #2.**)

> The `track:` item — **rename `GooglePeople` → `GoogleContacts`** — is a natural
> first step here: it aligns the api wrapper name with the `contacts/` operation
> dir and the `GOOGLE_CONTACTS_CONNECTOR_ID`, and it's the unit that moves into
> `@dxos/google-apis`.

### 4c. Shared low-level primitives — `@dxos/react-ui-card`

Not a message/event _composite_ (no `MessageSummary` — see `src/components/AUDIT.md`
for why that over-abstracts). The shared unit is the **Card-composition vocabulary**
one level below the domain tiles: the rows, the tile shell, the avatar. These are
already used across the Message and Event axes; a **card-focused** package
(`react-ui-card`) is a better home than an inbox-specific one because nothing here
is mail-specific.

Verified by import tracing:

| Primitive             | Message axis                                     | Event axis                          | Notes                                                                                                                                  |
| --------------------- | ------------------------------------------------ | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **`Row.*`**           | `InboxStack`, `ConversationStack`, `MessageCard` | `Event/EventDetails`, `EventEditor` | Namespace: `Person`, `Date`, `Ref`, `Tags`, `Attachments`, `Star`. The core shared block.                                              |
| **`CardTile`**        | `InboxStack`                                     | `EventStack`                        | `CardTile.Root` (Mosaic tile shell) + `CardTile.Header` (`Row.Star` · title · `Card.Menu`). Already domain-agnostic (`data: unknown`). |
| **`Avatar`** (to add) | 3× hand-rolled `DxAvatar` + `Row.Person`         | `Row.Person`                        | No shared primitive today — 3 sites hand-roll `DxAvatar`. Consolidate into one (actor/name → single hue).                              |

**Already in `@dxos/react-ui` / `-menu` — reuse, don't re-extract:**

- **Overflow menu** → `Card.Menu` (DropdownMenu). `CardTile.Header` already uses it.
- **Toolbars / action menus** → `MenuBuilder` + `Menu.Root` (`@dxos/react-ui-menu`).
  Used by every axis already (mailbox, conversation, event, calendar toolbars).
- **Star button** → `SystemIconButton.Star`; `Row.Star` is the thin wrapper. The
  _stateful_ star (tag-index vs calendar binding) stays domain-specific.
- **Avatar base** → react-ui `Avatar`. Note **plugin-inbox is the repo's only
  `DxAvatar` (lit-ui) consumer**; the shared `Avatar` should converge on react-ui's
  `Avatar` unless the lit element is deliberate (virtualized-list perf) — decide
  when building it.

**Plugin-local menu bits worth promoting:** `ViewMode` (`viewModeGroup` builder +
type) and the `CardTile.Header` menu-item shape — small, and shared once calendar moves.

**Blockers for `Row` extraction** (must be cut, no shims): `Row` imports `#hooks`
(`useActorContact`), `#meta` (i18n namespace), and `../../util` (`hashString`).
Options: move `useActorContact` + `hashString` into the package (they only need
`@dxos/echo-react`), and give the package its own translations namespace.

- **Stay put:** `containers/*` (surface-bound), `Initialize*`, `MarkdownViewer`,
  `ObjectArticle`, and the domain tiles themselves (`InboxStack`,
  `ConversationStack`, `EventStack`, `Event/*`) — these keep their distinct layouts
  (see §4c rationale) and move with their plugin. `ViewMode` / `Toolbar` / `Header`
  / `HtmlViewer` are reclassified in §4d.
- **Not a home:** `@dxos/react-ui-components` is a grab-bag of unrelated widgets
  (Waveform, Minimap, Spinner…); don't dump card primitives there.

**Open — does `react-ui-card` earn its own package?** `CardTile` needs
`@dxos/react-ui-mosaic` (Mosaic.Tile/Focus.Item), so it can't live in plain
`react-ui`. A `react-ui-card` depending on `react-ui` + `react-ui-mosaic` is a
reasonable home for `Row` + `CardTile` + `Avatar`; the alternative is `Row`→`react-ui`
and `CardTile`→`react-ui-mosaic` (split by dep), which scatters the vocabulary.

### 4d. Remaining shared components — where each lands (2026-07-21)

Verified by import tracing after the `react-ui-card` extraction:

- **`ViewMode`** (`viewModeGroup` + type/icons) — a general content view-mode toggle
  (html/markdown/plain), parameterized by `modes` (calendar passes
  `['markdown','plain']`, mail adds `html`). → move to **`@dxos/react-ui-menu`**,
  next to `MenuBuilder` and the `toolbar.ts` helpers above — a **semantic menu
  builder**, the `SystemIconButton`-in-`react-ui` pattern (base package hosts common
  semantic wrappers, not just raw primitives). react-ui-menu already has a
  translations namespace, so the 3 label keys move there and `viewModeGroup` drops
  its `ns` param. Better than `react-ui-components`: same package as the other menu
  builders, its own i18n, and no `@dxos/ai`/`assistant` weight.
- **`Toolbar` (`toolbar.ts`)** — `openGroup` / `deleteGroup` / `deleteAction` are
  **generic** open/delete action builders (universal toolbar actions, not
  inbox-specific), depending only on react-ui-menu's `ActionGroupBuilder(Fn)` types.
  → move to **`@dxos/react-ui-menu`** as convenience action builders: zero new deps
  (same package), no equivalent exists there today, and every plugin's toolbar can
  reuse them. (Contrast `ViewMode`, which is domain-specific and stays.)
- **`Header`** — a 20-line borderless-Card + bottom-rule wrapper (`Header.Root`).
  Its doc claims "Event and Message article headers," but that is **stale**: the
  Message header (`ConversationStack`) now hand-rolls its own subgrid, so the **only**
  consumer is `Event/Event.tsx` (calendar). → **drop from the shared set**; inline
  into `Event` or keep as a calendar-local helper. Do NOT put in `react-ui-card`.
- **`HtmlViewer`** — feasible to generalize into `@dxos/react-ui-components`, but
  email-coupled today (`attachments`/`db` resolve `cid:` images against message
  Blobs; `isPersonal`; `processEmailColors`). Split = generic sandboxed-iframe +
  DOMPurify + theme-color core → `react-ui-components`, with image-resolution +
  color-processing injected as callbacks; email glue stays in plugin-inbox.
  **Only one consumer** (`ConversationStack`), so **defer** until a second wants a
  sandboxed HTML viewer.

## 5. Dependency direction (the rule that keeps it clean)

```
react-ui-card               → react-ui, react-ui-mosaic  (no plugin/domain deps)
google-apis/jmap-apis       → http/effect only            (no framework, no plugin deps)
plugin-inbox/-calendar/-contacts → @dxos/types, react-ui-card, plugin-connector, plugin-*
plugin-google/-jmap         → the *-apis + the domain plugins' provider contracts
```

Provider plugins depend on domain plugins (for the target schema + sync
contract), **never the reverse** — the domain plugin must not import Gmail/JMAP.
This is exactly the `constants.ts`/`ConnectorAuthAnnotation` coupling that §3.1
flags as the one real code change (vs. mechanical file moves).

## 6. Resolved decisions & remaining questions

**Resolved (2026-07-21):**

1. **Contacts → its own `@dxos/plugin-contacts`.**
2. **plugin-inbox stays = the Mail plugin.** No `plugin-mail` rename, no
   meta-plugin bundle; calendar + contacts move out, mail stays put.
3. **AI layer (extractor / analyze / draft) stays in plugin-inbox.**
4. **Shared UI = a card-focused `@dxos/react-ui-card`** with only the genuinely-
   common low-level vocabulary (`Row`, `CardTile`, `Avatar`) — **no `MessageSummary`
   composite** (§4c); each plugin keeps its distinct high-level tiles/layouts.

**Still open:**

1. ~~**`apis` package naming**~~ — moot for now: §8h D1 keeps the wrappers inside the
   provider plugin (`plugin-google/src/apis/`), so the package name is only decided if a
   non-plugin consumer ever forces the extraction.
2. **Does `react-ui-card` earn its own package** (Row+CardTile+Avatar, deps on
   react-ui + react-ui-mosaic), or split `Row`→`react-ui` and `CardTile`→`react-ui-mosaic`?
   And should the shared `Avatar` converge on react-ui `Avatar` or keep `DxAvatar`?
3. **Sync-provider contract location** — the `MailSyncProvider` interface lives in
   plugin-inbox; does `plugin-calendar` define its own calendar-sync contract, or
   is there a shared `plugin-connector`-level sync abstraction to promote?
   _(Interim answer: §8d publishes it as `@dxos/plugin-inbox/sync`; the promotion question
   is unchanged and belongs to the §3.7 hoist.)_

**Resolved for the provider split (2026-08-08):** all five §8h decisions — `apis/` inside the
provider plugin, harness published as `./sync`, send routing inverted via a capability, one
`plugin-google` covering all three domains, and both provider plugins user-installable +
default-on. Open Q2 (`react-ui-card` packaging) and Q3's promotion half are untouched by it.

## 7. Provider-first split — `@dxos/plugin-google` / `@dxos/plugin-jmap` (headless)

**Extract these before the domain (mail/calendar/contacts) split.** Both trees are
**fully headless** — no `react`, no `@dxos/react-ui*` (verified by import scan). They
are pure sync/connector logic, so they extract as **leaf** plugins whose only in-repo
plugin dependency is `plugin-inbox` (still holding every domain type + the sync
harness). One dep now; it fans out to plugin-mail/calendar/contacts when the domains
split later.

### What relocates into each provider plugin

- **`plugin-google`** — `apis/google/*`, `services/google-*`,
  `operations/{mail,calendar,contacts}/google/*`, the three Google `Connector`
  contributions (Gmail / Google Calendar / Google Contacts, split out of
  `capabilities/connector.ts`), the Google constants, `GoogleApiError`.
- **`plugin-jmap`** — `apis/jmap/*`, `services/jmap-*`, `operations/mail/jmap/*`,
  `capabilities/jmap-credential-form.ts` (a schema form def, not React), the JMAP
  `Connector`, the JMAP constants, `JmapApiError`.

### Upstream deps

**External `@dxos` packages** (counts = import sites in the moved trees):

| Package                                                                                                                                      | google | jmap | Role                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---- | ------------------------------------------------------ |
| `@dxos/echo`                                                                                                                                 | 21     | 8    | Obj/Query/Database over synced objects                 |
| `@dxos/compute`                                                                                                                              | 20     | 5    | `Operation` / `Trigger` / services                     |
| `@dxos/link`                                                                                                                                 | 9      | 5    | `Cursor` / `AccessToken`                               |
| `@dxos/types`                                                                                                                                | 10     | 4    | `Message` / `Event` / `Person` (shared domain objects) |
| `@dxos/log`                                                                                                                                  | 12     | 5    | logging                                                |
| `@dxos/compute-runtime`                                                                                                                      | 6      | 2    | `withAuthorization`, runtime                           |
| `@dxos/extractor(-lib)`                                                                                                                      | 9      | 5    | body/entity extraction in mappers                      |
| `@dxos/pipeline(-email)`                                                                                                                     | 4      | 2    | email parsing stages                                   |
| `@dxos/plugin-connector`                                                                                                                     | 2      | 2    | `Connector` contract, `isCursorForTarget`              |
| `@dxos/echo-client`, `@dxos/effect`, `@dxos/schema`, `@dxos/app-toolkit`                                                                     | ✓      | ✓    | client, effect helpers, schema, progress constants     |
| `@dxos/markdown`, `@dxos/protocols`, `@dxos/edge-compute`, `@dxos/client`, `@dxos/config`, `@dxos/context`, `@dxos/async`, `@dxos/invariant` | ✓      | —    | google-only (OAuth, config, edge, markdown bodies)     |

Plus `@dxos/app-framework` for each plugin's `Connector` capability module
(`Capability.makeModule`, today in the shared `capabilities/connector.ts`).

**On `plugin-inbox`** (the seam that repoints at the domain split):

| Depends on                                                                                               | For                                                                                                                  | Fate at domain split                                                            |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `#types` (`Mailbox`, `Calendar`, `SystemTags`, `InboxOperation` defs, `SyncOptions`, `SyncStreamConfig`) | materialize targets + the op definitions the connector references (`MaterializeGmailTarget`, `GoogleMailSync`, …)    | repoints to plugin-mail / plugin-calendar / plugin-contacts                     |
| `operations/mail/mail-sync.ts` (`MailSyncProvider`, `MailSyncError`)                                     | the provider-agnostic sync harness each handler supplies a layer to                                                  | stays with **mail** (or promote the contract to `plugin-connector`, §6 open Q3) |
| `constants.ts`                                                                                           | connector ids + FK sources (`GOOGLE_INTEGRATION_SOURCE`, `GMAIL_SOURCE`, `JMAP_MESSAGE_SOURCE`, `JMAP_DEFAULT_HOST`) | keep in plugin-inbox for now (deferred §3.1 inversion)                          |
| `errors.ts`                                                                                              | shared `MailSyncError` (provider-specific `GoogleApiError`/`JmapApiError` move with the provider)                    | split shared vs provider-specific                                               |
| `testing/*` (`gmail-fixtures`, `jmap-fixtures`, `sync-fixture`, `otel-harness`)                          | test fixtures                                                                                                        | move with the provider or a shared `#testing`                                   |

### Decisions this forces

Each is a "how far do we go in _this_ step vs. defer" choice. All three recommendations
point the same way: do the **file moves** now with providers depending _upward_ on
plugin-inbox, and defer the three ownership cleanups to the later domain-split steps
where they're actually forced.

**1. Operation definitions vs. handlers.** An operation has a _definition_
(`Operation.make({ meta:{key}, input, output })` — id + schemas) and a _handler_ (the
impl). `types/InboxOperation.ts` is **one monolithic `@import-as-namespace` file**
declaring _every_ op def (google, jmap, calendar, contacts, mail, extractor); the
connector wires the provider defs in (`sync: InboxOperation.GoogleMailSync`,
`materializeTarget: InboxOperation.MaterializeGmailTarget`). Handlers live separately.
When `plugin-google` extracts, the handlers clearly move — the question is the defs:

- _Option A — leave defs in `#types`, depend upward._ `plugin-google` imports
  `InboxOperation.GoogleMailSync` to register its handler + wire its connector. Minimal
  churn (namespace file intact, the 6 external `InboxOperation` consumers untouched),
  but plugin-inbox declares ops it no longer implements — awkward ownership.
- _Option B — split the monolith, defs move with handlers._ Clean ownership (each plugin
  owns def + handler + connector), but it breaks the public `InboxOperation` namespace
  (6 consumers) and renames the ids (`InboxOperation.GoogleMailSync` →
  `GoogleOperation.MailSync`) — much bigger blast radius.

→ **Option A now**; break the `InboxOperation` monolith during the domain split. The
awkwardness is cosmetic and the dependency direction is already correct.

**2. Connector-id inversion — deferred** (§3.1). `types/Mailbox.ts`/`Calendar.ts`
hardcode connector ids via `ConnectorAuthAnnotation.set({ connectorIds:[…] })`, so the
**schema names its providers** (backwards; a third-party provider could never register).
But it's **not a blocker**: while the ids live in plugin-inbox `constants.ts` and both
`Mailbox` and the providers read them from there, nothing is circular — just an upstream
dep in the right direction. The proper fix (providers _contribute_ their ids to the
annotation at registration) only matters once you want provider-agnostic schemas.
→ **defer**; pay for it in the later inversion step, not the headless split.

**3. `MailSyncProvider` home** (§6 open Q3). `operations/mail/mail-sync.ts` holds the
provider-agnostic harness + the `MailSyncProvider` Effect-service _contract_; each
provider's handler supplies a **layer** to it, so providers depend up on plugin-inbox
for the contract.

- _Keep mail-side_ — fine while providers only do mail sync; calendar sync currently
  uses a separate harness, so nothing is shared there.
- _Promote a generalized `SyncProvider` to `@dxos/plugin-connector`_ — then mail,
  calendar, contacts, and the providers share one contract, and providers depend only on
  `plugin-connector` for it. Pairs naturally with the §3.7 sync-infra hoist.

→ **keep mail-side for the headless split**; revisit promotion during the §3.7 hoist —
generalize only if calendar wants the same harness.

## 8. Target folder structure for the provider split (2026-08-04)

§7 says _what_ relocates and _why_. This section is the concrete plan: the three trees
after the cut, the one new public export plugin-inbox must grow, the changes that are
**not** file moves, and the order to land them.

**Exemplar: `@dxos/plugin-trello`.** It is already the shape both provider plugins take —
headless (`TrelloPlugin.ts`, no `.tsx`), `capabilities/{connector,operation-handler}.ts`,
`operations/` + `services/` + `types/TrelloOperation.ts`, `Plugin.lazy` in `plugin.ts`, and
crucially it **depends on the domain plugin it feeds** (`@dxos/plugin-kanban`). Provider →
domain is therefore an established direction in this repo, not a new precedent
(`packages/plugins/plugin-trello`). It differs in one respect: Trello owns its own operation
_definitions_ (`TrelloOperation`), whereas Google/JMAP leave theirs in `InboxOperation`
under §7.1 Option A.

Legend: `←` moved in · `✂` moved out · `✚` new · `✄` split · `✎` edited in place · `⇢` relocated within the package.

### 8a. `@dxos/plugin-inbox` after the split

```
packages/plugins/plugin-inbox/src/
  apis/                          ✂ → plugin-google/src/apis, plugin-jmap/src/apis (2373 LOC, incl. apis/README.md rule)
  services/                      ✄ google-* → plugin-google, jmap-* → plugin-jmap (823 LOC; dir disappears)
  capabilities/
    connector.ts                 ✂ deleted — all four Connector entries move (Gmail/JMAP/Calendar/Contacts)
    jmap-credential-form.ts      ✂ → plugin-jmap/src/capabilities/credential-form.ts (+ its test)
    …                            = app-graph-builder, react-surface, settings, skill-definition,
                                   create-object, identity-specs, navigation-target-resolver, operation-handler
  operations/
    mail/mail-sync.ts            ⇢ src/sync/mail-sync.ts  (§8d — no longer an operation, it is the contract)
    mail/google/                 ✂ → plugin-google/src/operations/mail      (3038 LOC)
    mail/jmap/                   ✂ → plugin-jmap/src/operations/mail        (1945 LOC)
    calendar/google/             ✂ → plugin-google/src/operations/calendar  (667 LOC)
    contacts/google/             ✂ → plugin-google/src/operations/contacts  (364 LOC)
    index.ts                     ✎ InboxOperationHandlerSet loses its 9 provider entries
    util.ts                      ✂ deleted — parseFromHeader (its only export) → src/sync/headers.ts
    …                            = add-mailbox, analyze/, classify-email, draft-email*, extractor/,
                                   read-email, rename-filter, unsubscribe-sender
  sync/                          ✚ the provider-facing contract, published as ./sync (§8d)
    index.ts                     ✚ barrel (+ re-exports MailSyncError from ../errors)
    mail-sync.ts                 ← operations/mail/mail-sync.ts (harness + MailSyncProvider + MailSyncSource)
    binding.ts                   ← readBindingOptions from util/mailbox-sync.ts
    headers.ts                   ← parseFromHeader from operations/util.ts
    policy.ts                    ← MAIL_SYNC_CRON / MAIL_AUTO_SYNC from capabilities/connector.ts
  util/
    on-arrival.ts                ← util/mailbox-sync.ts, renamed once readBindingOptions left: the
                                   on-arrival extractor hooks are all that remained, and they are
                                   plugin-internal AI wiring that must stay OUT of the ./sync surface
  capabilities/
    mail-send.ts                 ✚ contributes both built-in providers' send ops; each entry moves to
                                   its provider plugin in steps 3-4 (§8e.2)
  types/
    InboxCapabilities.ts         ✎ + MailSendOperation registry (§8e.2)
    MailSend.ts                  ✚ the shared send contract (Input / Output / SentTag schemas) both
                                   send ops now declare — lets the capability be typed without a cast
    InboxOperation.ts            = unchanged — every provider op def stays here (§7.1 Option A)
    Mailbox.ts                   = unchanged — still names GMAIL/JMAP connector ids (§7.2, deferred)
    …                            = Calendar, DraftEvent, ExtractedFrom, Settings, SyncOptions,
                                   SyncStreamConfig, SystemTags (canonical, provider-agnostic)
  hooks/
    useSendEmail.ts              ✎ resolve the send op from the capability, drop the JMAP-vs-Gmail ternary (§8e.2)
    useTags.ts                   ✎ drop `GoogleMail.isSystemLabel` — the last apis import from UI (§8e.3);
                                   `useGmailTags` → `useVisibleTags`
  testing/
    gmail-fixtures.ts(+test)     ✂ → plugin-google/src/testing
    jmap-fixtures.ts(+test)      ✂ → plugin-jmap/src/testing
    otel-harness.ts              ✂ → plugin-google/src/testing (sole consumer is google sync-bench)
    sync-fixture.ts              ✄ seedMailboxBinding stays; the two provider runners move (§8e.5)
    index.ts / node.ts           ✎ drop the provider fixture + `Jmap`/`*Dataset` re-exports
    …                            = builder, data, email-processor + its two tests
  constants.ts                   ✄ GMAIL_SOURCE/GOOGLE_INTEGRATION_SOURCE/JMAP_MESSAGE_SOURCE/
                                   JMAP_DEFAULT_HOST move; the 4 connector ids stay (Mailbox/Calendar
                                   annotations still read them — §7.2); POPOVER/section types stay
  errors.ts                      ✄ GoogleApiError, GmailSendMessageInvalidError,
                                   AccessTokenNotPopulatedError, CalendarForeignKeyWrongTypeError,
                                   Jmap{Api,SendMessageInvalid,SendIdentityNotFound}Error move;
                                   MailSyncError + the classification/summary errors stay
  components/ containers/ extensions/ skills/ util/ paths.ts translations.ts   = unchanged
  moon.yml                       ✂ the stale `deploy-functions` task is deleted — it deployed
                                   `src/functions/google/{gmail,calendar}/sync.ts`, paths that never
                                   existed on this branch, and nothing invoked it
```

Net: **~9200 LOC leaves** (apis + services + the four provider operation trees + fixtures),
roughly a third of the plugin, with **zero change to `Mailbox` / `InboxOperation` / skills /
UI surfaces** — the public API 17 consumers depend on.

### 8b. `@dxos/plugin-google`

One plugin covering all three Google domains (§8h D4): one OAuth story, one credentials
service, one shared `google-api.ts` transport.

```
packages/plugins/plugin-google/
  dx.config.ts       key `org.dxos.plugin.google`, icon ph--google-logo--regular,
                     tags ['alpha','connector'] — matches plugin-inbox (§8h D5)
  PLUGIN.mdl         spec (Trello ships one; inbox's provider sections seed it)
  moon.yml           layer: library · tags: ts-vite-build, ts-test, pack
                     + check-module-structure: dx-trace-imports --export ./plugin --to "@dxos/react-ui"
                       --to react --fail-on present   (headless is a guarantee, not a hope)
  package.json       "private": true; deps per §7 table; NO react/react-ui runtime dep
  src/
    GooglePlugin.ts  headless: addOperationHandlerModule + SetupConnectors module + translations
                     (+ addSchemaModule only if a Google-owned schema ever appears — none today)
    plugin.ts        Plugin.lazy(meta, …) + `export { GoogleOperationHandlerSet } from './operations'`
    index.ts         meta + types + constants (the narrow, headless-safe barrel)
    meta.ts translations.ts
    constants.ts     ← GOOGLE_INTEGRATION_SOURCE, GMAIL_SOURCE, GMAIL_CONNECTOR_ID,
                       GOOGLE_CALENDAR_CONNECTOR_ID, GOOGLE_CONTACTS_CONNECTOR_ID
                       (re-exported from plugin-inbox for now; canonical here after §3.1)
    errors.ts        ← GoogleApiError, GmailSendMessageInvalidError, AccessTokenNotPopulatedError,
                       CalendarForeignKeyWrongTypeError
    apis/            ← src/apis/google/*  — framework-free (README.md rule moves with it)
      README.md  google-api.ts  GoogleMail/  GoogleCalendar/  GoogleContacts/
    services/        ← src/services/google-credentials.ts, google-mail-api.ts
    capabilities/
      index.ts
      connector.ts   ← the 3 Google Connector entries + getAccountEmail / testGoogleConnection /
                       onTokenCreated / isGoogleAuthRejection (reads MAIL_SYNC_CRON from #inbox sync)
      mail-send.ts   ✚ contributes { connectorId: GMAIL_CONNECTOR_ID, operation: GmailSend } (§8e.2)
      operation-handler.ts
    operations/
      index.ts       GoogleOperationHandlerSet (9 lazy entries)
      mail/          ← operations/mail/google/*   (mapper, tags, materialize/, send/, sync/)
      calendar/      ← operations/calendar/google/* (mapper, create/, list/, materialize/, sync/)
      contacts/      ← operations/contacts/google/* (mapper, list-groups/, sync/)
    testing/
      index.ts  gmail-fixtures.ts  otel-harness.ts  gmail-sync-fixture.ts (from sync-fixture.ts)
```

The redundant `google/` path level drops, and the **domain axis is preserved as the top
level** (`operations/{mail,calendar,contacts}`) so the later domain split (§4a) repoints
imports without moving files again.

### 8c. `@dxos/plugin-jmap`

Same shape, single domain, no OAuth (host + email + Bearer token via the credential form).

```
packages/plugins/plugin-jmap/
  dx.config.ts       key `org.dxos.plugin.jmap`, icon ph--envelope--regular,
                     tags ['alpha','connector'] (§8h D5)
  PLUGIN.mdl  moon.yml (as above)  package.json ("private": true)
  src/
    JmapPlugin.ts    headless: addOperationHandlerModule + SetupConnectors + translations
    plugin.ts  index.ts  meta.ts  translations.ts
    constants.ts     ← JMAP_MAIL_CONNECTOR_ID, JMAP_DEFAULT_HOST, JMAP_MESSAGE_SOURCE
    errors.ts        ← JmapApiError, JmapSendMessageInvalidError, JmapSendIdentityNotFoundError
    apis/            ← src/apis/jmap/*  (README.md, Jmap/, JmapMail/ incl. query.ts + its test)
    services/        ← src/services/jmap-credentials.ts, jmap-mail-api.ts
    capabilities/
      index.ts
      connector.ts        ← the JMAP Connector entry
      credential-form.ts  ← capabilities/jmap-credential-form.ts (+ test) — a schema form def, not React
      mail-send.ts        ✚ { connectorId: JMAP_MAIL_CONNECTOR_ID, operation: JmapSend } (§8e.2)
      operation-handler.ts
    operations/
      index.ts       JmapOperationHandlerSet (3 lazy entries)
      mail/          ← operations/mail/jmap/*  (mapper, tags, materialize/, send/, sync/)
    testing/
      index.ts  jmap-fixtures.ts  jmap-sync-fixture.ts
```

### 8d. The one new public surface — `@dxos/plugin-inbox/sync`

Providers cannot reach `src/operations/mail/mail-sync.ts` across a package boundary, so the
harness needs a real export. It is also no longer an operation (no definition, no handler),
which is why it becomes `src/sync/` rather than staying under `operations/`.

- `package.json`: add `"#sync"` to `imports` and `"./sync"` to `exports`, both →
  `src/sync/index.ts` (same shape as the existing `./types` / `./translations` entries).
- Exports: `runMailSync`, `MailSyncProvider`(+`Service`), `MailSyncSource`,
  `MailSyncSourceOptions`, `MailSyncStreams`, `MailSyncItem`, `MailSyncPreparation`,
  `ReconcileItem`, `reconcileToChanges`, `createSyncProgressKey`, `RunMailSyncOptions`,
  `readBindingOptions`, `parseFromHeader`, `MAIL_SYNC_CRON`, `MAIL_AUTO_SYNC`, and
  `MailSyncError` (re-exported from `errors.ts`).
- The on-arrival extractor hooks deliberately stay OUT of this barrel (they live in
  `util/on-arrival.ts`): they reach `Capability.Service` and `InboxOperation.ExtractMessage`, which no
  provider needs and which would drag the plugin's AI layer into the provider-facing surface.
- **Providers must import narrow subpaths, never the root barrel.** `@dxos/plugin-inbox`
  (`.`) transitively reaches React components; `@dxos/plugin-inbox/{types,sync}` do not.
  The CLI already documents exactly this hazard in `packages/devtools/cli/src/util/skills.ts`,
  and each provider's `check-module-structure` task enforces it.
- Everything else providers need is **already public**: `InboxOperation`, `Mailbox`,
  `Calendar`, `SystemTags`, `SyncOptions`/`CalendarSyncOptions`, `SyncStreamConfig` via
  `@dxos/plugin-inbox/types`.

### 8e. The five changes that are not file moves

1. **Connector split.** `capabilities/connector.ts` (200 LOC, four entries) is deleted from
   plugin-inbox along with the `SetupConnectors` module in `InboxPlugin.tsx` and the
   `Connector` entry in `capabilities/index.ts`. The Google helpers (`getAccountEmail`,
   `testGoogleConnection`, `onTokenCreated`, `isGoogleAuthRejection`) go with the Google
   entries; `MAIL_SYNC_CRON`/`MAIL_AUTO_SYNC` are mail policy and stay in plugin-inbox
   (`src/sync/policy.ts`), read by both providers so they can't drift apart.
2. **Send routing → a capability.** `hooks/useSendEmail.ts` hardcodes
   `connectorId === JMAP_MAIL_CONNECTOR_ID ? JmapSend : GmailSend`. Add
   `InboxCapabilities.MailSendOperation`, contributed by each provider's
   `capabilities/mail-send.ts`, and resolve by the connection's `connectorId`. Two shape constraints
   found while building it:
   - The op must be returned from a **closure** (`getOperation: () => …`), not held as a value
     property — `MailboxAction`'s doc records that an `Operation.Definition` on a capability value
     makes the capability atom read recurse.
   - Typing it as `Operation.Definition.Any` would force a cast at the result site
     (`sent.sentTag.source`), so the send input/output schemas are extracted to `types/MailSend.ts`
     and both send ops declare them; the capability is typed `Definition<MailSend.Input,
MailSend.Output>`. A provider that returns the wrong shape now fails to compile.
   - `useSendEmail` is called from `components/`, which must not call capability hooks, so the list is
     resolved by the containers (`MessageArticle`, `EditMessageArticle`) and threaded through
     `ConversationStack`'s context — the same pattern `MailboxAction` already uses.
     _Not a hard blocker_ — under §7.1 Option A both op defs and both connector ids stay in
     plugin-inbox, so the ternary would still compile — but it is the same inversion §3.1 needs
     later, it is ~20 LOC, and it removes the last place plugin-inbox decides which providers
     exist.
3. **`useTags` provider-agnostic label filter — a genuine blocker.**
   `hooks/useTags.ts` calls `GoogleMail.isSystemLabel` from `apis/google`; after the move that
   becomes plugin-inbox → plugin-google, the forbidden direction (§5). Removed, and
   `useGmailTags` → `useVisibleTags` (one other consumer, `InboxStack`).

   **This uncovered a latent bug, deliberately NOT fixed here — see §8i.** The call was already
   dead: `isSystemLabel` expects a Gmail label id, but both call paths pass an **ECHO tag URI**
   (`useMessageTags` builds `{ id: uri, … }`; `MailboxArticle`'s atom family does the same), so the
   predicate was always `false`. Dropping it is exactly behaviour-preserving; making it _work_ is a
   visible UI change and is filed separately.

4. **Handler-set partition.** `InboxOperationHandlerSet` drops its 9 provider entries;
   `GoogleOperationHandlerSet` / `JmapOperationHandlerSet` take them. **The CLI must merge
   both** — `packages/devtools/cli/src/util/skills.ts` registers `InboxSendSkill` (tools:
   `GmailSend`) and `CalendarSkill` (tools: `GoogleCalendarSync`); without the merge those
   skills fail at runtime with "tool not found", not at build time. Composer gets them via
   each plugin's `addOperationHandlerModule`.
5. **`testing/sync-fixture.ts` must split.** It imports `googleMailSyncProvider` **and**
   `jmapMailSyncProvider` plus both services (180 LOC), so left in plugin-inbox it inverts
   the dependency for both providers. Split: `seedMailboxBinding` + the shared seeding
   helpers stay in plugin-inbox `./testing` (`operations/sync.test.ts` needs only those);
   each provider's `runMailSync` wiring moves to its own `./testing`. `otel-harness.ts` is
   generic but has exactly one consumer (`google/sync/sync-bench.test.ts`) → move it there
   rather than promote it to `@dxos/effect/testing`.

### 8f. Call sites outside the three packages

| File                                                                   | Change                                                                                                                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/apps/composer-app/src/plugin-defs.tsx`                       | register `GooglePlugin()` / `JmapPlugin()` in `getPlugins` **and** add both keys to `getDefaults` next to `InboxPlugin.meta.profile.key` (§8h D5)       |
| `packages/apps/composer-app/{package.json,tsconfig.json}`              | add both `workspace:*` deps + project references                                                                                                        |
| `packages/apps/composer-app/src/playwright/plugins/inbox-http-mock.ts` | repoint `GmailDataset`/`generateGmailDataset` → `@dxos/plugin-google/testing`, `Jmap`/`JmapDataset`/`generateJmapDataset` → `@dxos/plugin-jmap/testing` |
| `packages/devtools/cli/src/util/skills.ts`                             | merge `GoogleOperationHandlerSet` + `JmapOperationHandlerSet` into `operationHandlers` (§8e.4)                                                          |
| `packages/stories/stories-inbox/src/stories/MailboxSync.stories.tsx`   | register both provider plugins so the connectors resolve                                                                                                |

No other consumer touches a provider symbol: the 17 packages importing `@dxos/plugin-inbox`
pull `Mailbox` (28×), `InboxOperation` (6×), `Calendar` (4×), `ExtractedFrom` (3×) — all of
which stay (§7.1 Option A).

### 8g. Landable steps

Each step is independently green (`moon run <pkg>:build`, `moon run <pkg>:test`, and
`moon run plugin-inbox:check-module-structure`).

1. ✅ **Prepare in place** — created `src/sync/` + the `#sync` / `./sync` exports; moved
   `mail-sync.ts`, `readBindingOptions`, `parseFromHeader`, and the sync policy constants into it;
   repointed 11 imports; deleted the drained `operations/util.ts` and renamed the drained
   `util/mailbox-sync.ts` → `util/on-arrival.ts`. _(Done.)_
2. ✅ **Invert the two UI couplings in place** (§8e.2, §8e.3) — `MailSendOperation` capability +
   `types/MailSend.ts` contract, threaded through the containers; `useTags` de-Googled. Surfaced
   §8i. _(Done.)_
3. ✅ **Extract `@dxos/plugin-jmap`** (~4150 LOC moved, one domain, no OAuth) — scaffolded from
   `plugin-trello`, tree moved with `git mv`, `sync-fixture` split, composer-app / CLI / http-mock
   repointed. 65 tests moved with it (plugin-inbox 232 → 167, exactly the difference); the JMAP
   Playwright spec passes against the extracted plugin (connect → sync → reply). **Six things step 4
   inherits, four of them only findable by an integration run:**
   - A new export subpath needs a **`vite.config.ts` entry**, not just a `package.json` entry. The
     `source` condition makes dev and vitest work while `dist/lib/<name>.mjs` is never emitted — this
     surfaced only in the Playwright run, as `Cannot find module .../dist/lib/sync.mjs`.
   - A provider's `./testing` needs the **node-condition split** for the same reason plugin-inbox's
     does: anything reaching `@dxos/compute` → `@dxos/ai` breaks Playwright's loader
     (`parsimmon.regexp is not a function`). Fixtures in `testing/node.ts`, the sync runner only in
     `testing/index.ts`.
   - `testing/sync-fixture.ts` needed its **own export** (`@dxos/plugin-inbox/testing/sync`): the
     provider's sync tests need `seedMailboxBinding`/`ambientSyncServices`, but `./testing`'s node
     condition must stay free of `@dxos/compute`.
   - `seedSenderOrganizations` was typed on `GmailDataset | JmapDataset`; the shared harness cannot
     name a provider, so it now takes a **structural `SenderDataset`** that both satisfy.
   - Exported test entry points need **explicit return types** (TS2883, "cannot be named without a
     reference to …"), the same reason `runMailSync` writes its own out.
   - `capabilities/operation-handler.ts` contributes `Capabilities.OperationHandler` (app-framework),
     **not** `AppCapabilities.OperationHandler`.
4. **Extract `@dxos/plugin-google`** (~6600 LOC, three domains) the same way, applying all six
   findings above. Its `constants.ts` keeps `GMAIL_SOURCE = 'com.google.mail'` for messages while tags
   carry `com.google.gmail` — deliberate asymmetry, see `Tag.md`; JMAP could collapse both onto one
   `JMAP_DOMAIN` because its message source already _was_ the domain.
5. ✅ **Sweep plugin-inbox** — mostly done inline with steps 3-4 (`capabilities/connector.ts`,
   `capabilities/mail-send.ts`, `apis/`, `services/`, the provider errors, and `testing/node.ts` are
   all gone). This step finished it: deleted the `deploy-functions` moon task (it deployed
   `src/functions/google/…`, paths that never existed on this branch, and nothing invoked it), and
   dropped `@dxos/context`, `@dxos/async` and `@dxos/edge-compute` — unreferenced once the providers
   left — along with their tsconfig references. `@dxos/protocols` and `@dxos/config` stay: `scripts/`
   uses them, which a `src/`-only grep misses.

   **Still deliberately in `constants.ts`:** `GMAIL_CONNECTOR_ID`, `GOOGLE_CALENDAR_CONNECTOR_ID`,
   `JMAP_MAIL_CONNECTOR_ID` and `GOOGLE_INTEGRATION_SOURCE`, each duplicating a provider's own
   constant because `types/Mailbox|Calendar|DraftEvent` name their providers — they disappear with the
   §3.1 inversion, not before.

6. **Then, unchanged:** roadmap 5 (§3.7 sync-infra hoist), 6 (§3.1 connector-id inversion —
   at which point the provider constants become canonical in the provider plugins), 7–8
   (domain split; each provider's `operations/{mail,calendar,contacts}` repoints from
   plugin-inbox to plugin-mail/-calendar/-contacts without moving a file).

JMAP-before-Google is deliberate: it is a third the size, single-domain, and has no OAuth
helpers, so the packaging problems (headless `moon.yml` guard, `./sync` export shape,
fixture split, registration sites) get solved on the cheaper package.

### 8i. Found during step 2 — system tags render as chips

`useVisibleTags` was _intended_ to hide provider system labels (Inbox, Starred, Sent, Important,
Unread, the CATEGORY_* set) from the message tag row, but the guard has been inert since tags became
ECHO objects addressed by uri — `GoogleMail.isSystemLabel(<echo uri>)` never matched. So today every
canonical system tag a message carries renders as a chip alongside its user tags, in both
`InboxStack` rows and the `ConversationStack` tag row. Nothing else filters them: `MailboxArticle`'s
`useTags(db)` map and `ConversationStack`'s `useQuery(db, Filter.type(Tag.Tag))` both return the full
tag set.

**Superseded by the tag-origin design** — see [`Tag.md`](../../../core/echo/echo/src/Tag.md) §"Tag
origin" (decided 2026-08-08). Rather than a local predicate in plugin-inbox, a tag's origin becomes a
first-class, queryable property derived from the foreign key it already carries: user (no key),
canonical DXOS (`org.dxos.tag`), or foreign provider (`com.google.gmail`, `org.ietf.jmap`).
Foreign-provider tags become read-only and are excluded from pickers by default; canonical DXOS tags
stay locally toggleable, which is what keeps the star / draft / sent flows working. That work spans
`@dxos/echo`, `react-ui-form`, and the provider plugins, so it is tracked there rather than here.

Two touchpoints for this extraction:

- The origin-domain capability (rollout step 2) is contributed by `plugin-google` / `plugin-jmap`, so
  it lands naturally in §8g steps 3-4 — one more `capabilities/*.ts` per provider, same shape as
  `mail-send.ts`.
- `GMAIL_TAG_SOURCE` / `JMAP_TAG_SOURCE` move with their providers as planned; do **not** rename them
  to fit a domain convention (a persisted `Meta.keys[].source` rename orphans every existing tag and
  makes sync re-create duplicates — see `Tag.md`).

### 8h. Decisions (all resolved 2026-08-08)

1. **`apis/` inside the provider plugin, not its own package.** ✅ `plugin-google/src/apis/`,
   `plugin-jmap/src/apis/` — framework-free, `apis/README.md` rule intact. Keeps roadmap
   step 2 from standing up two packages with exactly one consumer each; promote to
   `@dxos/google-apis` only when something outside the plugin wants them. Also settles §6
   open Q1 (naming) by deferring it.
2. **Harness location.** ✅ **`@dxos/plugin-inbox/sync` now** (§8d); promotion to
   `@dxos/plugin-connector` deferred to the §3.7 hoist, per §7.3.
3. **Send routing.** ✅ **Capability registry now** (§8e.2), even though Option A makes the
   ternary survive compilation — the inversion is ~20 LOC, lands in step 2 of §8g while the
   provider code is still local to test against, and is the same shape §3.1 needs later.
4. **One `plugin-google`, not three.** ✅ The three Google connectors share OAuth scopes,
   `google-api.ts`, `GoogleCredentials`, and `GoogleApiError`; splitting by domain would
   triplicate all of it (or force the `@dxos/google-apis` package that D1 just avoided).
   Revisit only if Calendar/Contacts ever ship independently.
5. **Registry visibility.** ✅ **Both are user-installable and on by default** — registered in
   `getPlugins` _and_ keyed into `getDefaults`, `tags: ['alpha', 'connector']` matching
   plugin-inbox's own tags, each with a `PLUGIN.mdl` for its registry card.
   - Rejected: the `plugin-trello` treatment (`getPlugins` only, opt-in) — a default Inbox
     install would then offer no mail providers at all, so "Add mailbox" dead-ends until the
     user discovers plugin-google. That is a broken default, not a preference.
   - Rejected: `getCorePlugins` — near-zero cost (both are `Plugin.lazy` and only contribute
     on `SetupConnectors`), but provider integrations are not infrastructure, and it would
     remove the user's ability to turn a provider off.
