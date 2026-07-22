# plugin-inbox — decomposition audit

_Analysis of how `@dxos/plugin-inbox` could be split into focused domain plugins
(Mail / Calendar / Contacts), provider plugins (Google, JMAP, …) owning the
`./apis` wrappers, and a shared card-focused `react-ui-card` UI package._

> Scope: architecture only. A narrower component-level audit (message-header
> divergence) lives in [`src/components/AUDIT.md`](src/components/AUDIT.md).

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

- **`ViewMode`** (`viewModeGroup` + type/icons) — a **menu-builder helper**, not a
  card primitive (deps: `@dxos/react-ui-menu` only; takes the i18n `ns` as a param).
  Shared by `ConversationStack` (mail) + `Event/useToolbar` (calendar). → move to
  `@dxos/react-ui-card` as a **`menu`/`toolbar` submodule** (not with the Card
  components). Slightly email-leaning (`html` mode is messages-only) but events pass
  a reduced `modes` list, so it's genuinely shared.
- **`Toolbar` (`toolbar.ts`)** — `openGroup` / `deleteGroup` / `deleteAction`, the
  DRY source for identical open/delete actions across the Message and Event
  toolbars. Two consumers: `ConversationStack/useToolbar` + `Event/useToolbar`. Not
  dead. → moves with `ViewMode` to `react-ui-card`'s toolbar submodule.
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

## 6. Suggested sequencing (each step independently landable + testable)

1. **Rename `GooglePeople` → `GoogleContacts`** (tracked). Pure rename, no move.
2. **Extract `apis/` → `@dxos/google-apis` + `@dxos/jmap-apis`** (framework-free;
   they already are). Lowest risk, no consumer churn (internal imports only).
3. ✅ **Extract `@dxos/react-ui-card`** — the shared low-level vocabulary `Row` +
   `CardTile` + a consolidated `Avatar` (§4c); avatar/hue unified across the four
   summary sites. Unblocks calendar's move without a plugin→plugin UI dep. _(Done —
   PR #12300; `ViewMode`/`Toolbar` submodule still to follow, §4d.)_
4. **Invert the connector-id coupling** (§3.1): stop `types/Mailbox|Calendar`
   importing connector ids; contribute the connector list to the schema
   annotation at registration. Unblocks the domain/provider separation.
5. **Hoist shared sync infra to `@dxos/plugin-connector`** (§3.7):
   `findBindingForTarget` / `createSyncRoutine` / `syncTarget` from `util/`. Lets
   calendar/contacts/provider plugins share sync plumbing without depending on
   plugin-inbox.
6. **Split provider ops into `@dxos/plugin-google` / `@dxos/plugin-jmap`.**
7. **Move Calendar out → `@dxos/plugin-calendar`** (`Calendar` type,
   calendar/event surfaces + containers + graph nodes + `calendar` skill +
   draft-event ops). Update the ~4 consumers importing `Calendar`/`CalendarSkill`.
8. **Move Contacts out → `@dxos/plugin-contacts`** (related surfaces;
   `useActorContact` now in `react-ui-card`; provider sync now in `plugin-google`).
9. `plugin-inbox` remains the **Mail plugin** — keeps `Mailbox`, message UI, the
   AI layer, mail sync. Consumers importing `Mailbox`/`InboxOperation`/`InboxSkill`
   are unaffected; only `Calendar`/`Contacts` importers repoint (no shims).

Each new package is `"private": true` and uses `workspace:*` for in-repo deps
(`workspace:^` for peers), per repo non-negotiables.

## 7. Resolved decisions & remaining questions

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
