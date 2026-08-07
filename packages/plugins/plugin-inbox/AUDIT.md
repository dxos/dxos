# plugin-inbox — decomposition audit

_Analysis of how `@dxos/plugin-inbox` could be split into focused domain plugins
(Mail / Calendar / Contacts), provider plugins (Google, JMAP, …) owning the
`./apis` wrappers, and a shared card-focused `react-ui-card` UI package._

> Scope: architecture only. A narrower component-level audit (message-header
> divergence) lives in [`src/components/AUDIT.md`](src/components/AUDIT.md).

---

## Plan (roadmap)

The end-state topology and its rationale are in §4–§5; the seams to cut are in §3.
Each step below is independently landable + testable, and links to the section that
details it.

1. ✅ **Rename `GooglePeople` → `GoogleContacts`** — pure rename, no move. _(Done —
   PR #12300.)_
2. **Extract `apis/` → `@dxos/google-apis` + `@dxos/jmap-apis`** — framework-free
   wrappers (§3.5); lowest risk, internal imports only.
3. ✅ **Extract `@dxos/react-ui-card`** — shared low-level card vocabulary `Row` +
   `CardTile` + `Avatar`, avatar/hue unified (§4c). _(Done — PR #12300; `ViewMode` +
   `Toolbar` → `@dxos/react-ui-menu` still to follow, §4d.)_
4. **Split the headless provider plugins — `@dxos/plugin-google` / `@dxos/plugin-jmap`**
   (§7). Pure sync/connector logic (no UI); extract as leaf plugins depending only on
   plugin-inbox. Defer the connector-id inversion (providers import ids from
   plugin-inbox `constants.ts`). See §7 for upstream deps + the three ownership
   decisions this defers.
5. **Hoist shared sync infra to `@dxos/plugin-connector`** (§3.7):
   `findBindingForTarget` / `createSyncRoutine` / `syncTarget` from `util/`.
6. **Invert the connector-id coupling** (§3.1): providers _contribute_ their ids to
   the schema annotation at registration; `types/Mailbox|Calendar` stop naming them.
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

1. **`constants.ts` is a cross-domain hub.** Connector ids
   (`GMAIL_CONNECTOR_ID`, `JMAP_MAIL_CONNECTOR_ID`, `GOOGLE_CALENDAR_CONNECTOR_ID`,
   `GOOGLE_CONTACTS_CONNECTOR_ID`) are imported by `types/Mailbox.ts` and
   `types/Calendar.ts` (via `ConnectorAuthAnnotation`). So the **domain schema
   currently names its providers** — the schema→provider direction is backwards
   for a clean split. Needs the connector-id list to be contributed to the schema
   annotation at plugin-registration time, or the annotation to accept ids
   resolved from a registry, so `Mailbox` need not import Gmail/JMAP ids.
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

1. **`apis` package naming** — `@dxos/google-apis` vs `@dxos/api-google`; one
   package per provider, or a single `@dxos/mail-apis`?
2. **Does `react-ui-card` earn its own package** (Row+CardTile+Avatar, deps on
   react-ui + react-ui-mosaic), or split `Row`→`react-ui` and `CardTile`→`react-ui-mosaic`?
   And should the shared `Avatar` converge on react-ui `Avatar` or keep `DxAvatar`?
3. **Sync-provider contract location** — the `MailSyncProvider` interface lives in
   plugin-inbox; does `plugin-calendar` define its own calendar-sync contract, or
   is there a shared `plugin-connector`-level sync abstraction to promote?

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
