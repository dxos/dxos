# Inbox shared components — factoring Event/Message into common primitives

Date: 2026-06-15
Plugin: `packages/plugins/plugin-inbox`

## Goal

`plugin-inbox` renders two parallel object families:

- **Mailbox + Message** → surfaces `MailboxArticle` (MessageStack + MessageTile + ConversationTile) and `MessageArticle`.
- **Calendar + Event** → surfaces `CalendarArticle` (EventStack + EventTile) and `EventArticle`.

`CalendarArticle` mirrors `MailboxArticle`; `EventArticle` mirrors `MessageArticle`. Prior work already
shares the star (`Header.StarButton` → `SystemIconButton.Star`), the read-only `MarkdownViewer`, the
`viewModeGroup` toolbar dropdown, and the `EventDetails` row fragment. This change factors out the
remaining duplicated structure so the two families share one set of presentation primitives:

1. A common **Tile root** for `EventTile`/`MessageTile`/`ConversationTile` carrying `SystemIconButton.Star`.
2. A common **article layout** + **header chrome** shared by `EventArticle`/`MessageArticle`.
3. Common **toolbar operation groups** (shared menu builder fns) beyond `viewModeGroup`.
4. Removal of the bespoke **`InboxSettings`** surface in favour of the generic settings form surface.

Additionally, "thread" is renamed to **Conversation** in the inbox UI/grouping layer (see §6) — "thread"
is overloaded by `plugin-thread` and the `Thread.Thread` comment schema.

Non-goals: changing ECHO object schemas (`Message`/`Event`/etc.), the `Message.threadId` field, Gmail
wire mapping, sync/extraction behaviour, or the operations themselves. This is a presentation-layer
refactor; observable behaviour is preserved (the only intentional changes: the event star is owned by the
tile shell rather than `EventDetails`, and the inbox-owned `Settings.threads` flag is renamed to
`Settings.conversations`).

## Current state (post-merge of #11830)

Shared today (keep, but reorganized — see below):

- `components/Header/Header.tsx` — `Header.{DateRow,ObjectRow,PersonRow,TagsRow,StarButton}`. These are
  Card-row primitives, not header-specific; they are extracted into a `Row.*` namespace (§0).
- `components/MarkdownViewer/` — read-only CodeMirror viewer, used by `Event.Body` + `Message.Body`.
- `components/ViewMode/viewMode.ts` — `viewModeGroup`, `ViewMode`, `VIEW_MODE_ICONS`.
- `components/Event/EventDetails.tsx` — event row fragment used by `EventTile`, `EventCard`, `Event.Header`.

Still duplicated (targets):

- **Card-row primitives** — `Header.*` rows are the de-facto shared row vocabulary, but `MessageTile`
  hand-rolls its own `DxAvatar`+text "from" row instead of `PersonRow`, so message and event people render
  differently; and `Message.Header` only renders `sender` (the `// TODO: List other To/CC/BCC` is open).
- **Tile shell** — `EventTile` (in `EventStack.tsx`) inlines `Mosaic.Tile → Focus.Item → Card.Root`;
  `MessageStack.tsx` has a separate `MessageStackTile` shell. No common root.
- **Article scaffold** — `EventArticle` and `MessageArticle` both render
  `Panel.Root.dx-document → Panel.Toolbar → Panel.Content[grid-rows-[auto_1fr]]`, copy-pasted.
- **Header chrome** — `Event.Header` and `Message.Header` each hand-roll the borderless
  `Card.Root border={false} fullWidth classNames='p-1 border-b border-subdued-separator'` + `Card.Body`.
- **Toolbar ops** — `open`/`delete`/`more` builder groups duplicated across `Event/useToolbar.tsx` and
  `Message/useToolbar.tsx`; only `viewModeGroup` is shared.
- **Settings** — `components/InboxSettings/` + a `pluginSettings` surface in `react-surface.tsx`.

## Dependency UML

```mermaid
graph TD
  subgraph shared[components/ — presentation-only, no app-framework]
    RowStar[Row.Star → SystemIconButton.Star]
    Rows[Row.Person/Date/Tags/Ref]
    HeaderRoot[Header.Root — borderless Card chrome]
    Markdown[MarkdownViewer]
    ViewMode[ViewMode.viewModeGroup]
    ToolbarOps[Toolbar.openGroup / deleteGroup]
    TileRoot[Tile.Root — Mosaic.Tile→Focus.Item→Card.Root]
    TileHeader[Tile.Header — star · title · menu]
    EventDetails[EventDetails — event rows]
    ObjectArticle[ObjectArticle — Panel scaffold]
  end

  RowStar --> TileHeader
  RowStar --> EventDetails
  Rows --> EventDetails
  Rows --> MessageTile
  Rows --> ConversationTile
  Rows --> MessageHeader
  HeaderRoot --> EventHeader
  HeaderRoot --> MessageHeader

  TileRoot --> EventTile
  TileHeader --> EventTile
  EventDetails --> EventTile
  EventDetails --> EventCard
  EventDetails --> EventHeader

  TileRoot --> MessageTile
  TileHeader --> MessageTile
  TileRoot --> ConversationTile
  TileHeader --> ConversationTile

  Markdown --> EventBody[Event.Body]
  Markdown --> MessageBody[Message.Body]
  ViewMode --> EventToolbar[Event.Toolbar]
  ViewMode --> MessageToolbar[Message.Toolbar]
  ToolbarOps --> EventToolbar
  ToolbarOps --> MessageToolbar

  subgraph containers[containers/ — surfaces, use capabilities]
    EventTile --> EventStack
    EventStack --> CalendarArticle
    MessageTile --> MessageStack
    ConversationTile --> MessageStack
    MessageStack --> MailboxArticle
    EventHeader --> EventArticle
    EventBody --> EventArticle
    EventToolbar --> EventArticle
    MessageHeader --> MessageArticle
    MessageBody --> MessageArticle
    MessageToolbar --> MessageArticle
    ObjectArticle --> EventArticle
    ObjectArticle --> MessageArticle
  end
```

## What Event and Message have in common (and what differs)

| Concern        | Common                                               | Event-specific                         | Message-specific                                      |
| -------------- | ---------------------------------------------------- | -------------------------------------- | ----------------------------------------------------- |
| Star           | `Row.Star` → `SystemIconButton.Star`                 | TagIndex on Calendar                   | TagIndex on Mailbox                                   |
| Tile shell     | `Tile.Root` + `Tile.Header` (star·title·menu)        | body = `EventDetails`                  | body = `Row.Person`/snippet/`Row.Tags`, or convo rows |
| Header chrome  | `Header.Root` (borderless Card + Card.Body)          | rows = `EventDetails(title='heading')` | subject/sender/refs/tags rows                         |
| Body           | `MarkdownViewer`                                     | description; editable draft via editor | block selection (enriched/markdown/plain)             |
| Toolbar        | `viewModeGroup`, `openGroup`, `deleteGroup`          | save, more-dropdown wrapping delete    | reply/replyAll/forward, load-images, extract          |
| Article layout | `ObjectArticle` (Panel scaffold)                     | viewport wraps body in ScrollArea      | body rendered directly in content grid                |
| People         | `Row.Person` (role: from/to/cc/bcc/attendee, avatar) | attendees (role=attendee)              | sender (role=from); to/cc/bcc pending schema          |
| Dates          | `Row.Date` (calendar row) / `formatDateTime` util    | start–end range + duration             | `created` inline in `Tile.Header` title slot          |
| Relations/refs | `Row.Ref` (card-preview anchor)                      | linked Meeting (handshake button)      | extracted objects (Trip/Person/…)                     |
| Tags           | `Row.Tags`                                           | —                                      | Gmail labels + user tags                              |

## Component specs

### 0. `components/Row/Row.tsx` (new) — shared Card-row primitives

The single source for every Card-row "extension" rendered inside a `Card.Body`. Presentation-only
(no app-framework). Extracted from today's `Header.*` rows; consumed by **all** tiles, cards, and headers
so a Person/Date/Tags/Ref row is defined exactly once. Each renders a `Card.Row` with a leading
`Card.Block` (icon/avatar/button) and content track.

- `Row.Person` — generalizes `PersonRow`. Props `{ actor, role?: 'from'|'to'|'cc'|'bcc'|'attendee', avatar?, db?, onContactCreate?, onRemove? }`.
  `role` drives the leading label/icon (and is rendered as a recipient-kind hint where relevant); `avatar`
  swaps the contact-anchor icon for a `DxAvatar` (the variant `MessageTile`/`ConversationTile` need).
  Keeps the existing contact-anchor (`DxAnchorActivate`), `useActorContact`, create-contact fallback, and
  trailing remove button. **`MessageTile`/`ConversationTile` adopt this** (avatar variant) instead of
  hand-rolled `DxAvatar` markup, so message and event people render identically.
- `Row.Date` — today's `DateRow`: calendar-icon row with a single date or start–end range + duration.
  The message tile/header keep their compact inline `created` date in the `Tile.Header` title slot (a
  different affordance), but both share the `formatDateTime` util — `Row.Date` is the canonical row form.
- `Row.Tags` — today's `TagsRow`: label+hue chips, optional `onTagClick` (Gmail labels + user tags).
- `Row.Ref` — today's `ObjectRow`: an ECHO ref/relation with a card-preview anchor (`AnchorIconButton`
  stays internal to `Row`). Used for message-extracted objects and the event's linked Meeting.
- `Row.Star` — today's `StarButton`: the leading-gutter star toggle (`SystemIconButton.Star`), used by
  `Tile.Header`, `EventDetails` heading, and anywhere a star sits in a `Card.Block`.

`components/Header/Header.tsx` is reduced to `Header.Root` only (the borderless-Card chrome, §2); the row
symbols move to `Row`. No compatibility re-exports — every importer (`Event.tsx`, `Message.tsx`,
`EventDetails.tsx`, `MessageStack.tsx`, `EventStack.tsx`) switches to `Row.*` in this change.

Note on To/CC/BCC: the `Message` schema (`@dxos/types`) has only `sender` today (no to/cc/bcc; `Actor.role`
is the AI role, not a recipient kind). `Row.Person` supports those roles so the UI is ready, but only
`from` (sender) and `attendee` are wired now; to/cc/bcc wiring is gated on a schema/`properties` change
(out of scope here).

### 1. `components/Tile/Tile.tsx` (new)

Presentation-only namespace, no app-framework deps. Replaces the inlined `EventTile` shell and
`MessageStackTile`.

- `Tile.Root` — `forwardRef`, props `{ id, data, location, current, onCurrentChange, onClick?, classNames?, children }`.
  Renders `Mosaic.Tile asChild classNames={TILE_CLASSNAMES} → Focus.Item asChild → Card.Root fullWidth border={false}`.
  `TILE_CLASSNAMES = 'dx-hover dx-current dx-selected p-1 rounded-md border border-subdued-separator'`
  (moved here from both stacks; single source).
- `Tile.Header` — props `{ starred?, onToggleStar?, title: ReactNode, menu?: boolean }`. Renders
  `Card.Header` with `Card.Block` › `Row.Star`, a `Card.Title` slot for `title`, and `Card.Menu`
  when `menu` (default `false`). The star renders only when `onToggleStar` is set (matching `Row.Star`).

Consumers:

- `EventTile` → `Tile.Root` › `Tile.Header(star, title=event title)` + `Card.Body` › `EventDetails(title=false, maxAttendees=8)`.
- `MessageTile` → `Tile.Root` › `Tile.Header(star, title=subject·date, menu)` + `Card.Body` › `Row.Person(avatar)`/snippet/`Row.Tags`.
- `ConversationTile` → `Tile.Root` › `Tile.Header(star, title=subject)` + `Card.Body` › per-message `Row.Person(avatar)` rows.

Behavioural change: the **event star moves from `EventDetails` into `Tile.Header`** so both tile types
own the star in the shell. `EventDetails` keeps rendering the star only on the article-header path
(`title='heading'`); the tile path passes `title={false}` and no longer renders a star row.

### 2. `Header.Root` (added to `components/Header/Header.tsx`)

`Header.Root` — props `ThemedClassName<PropsWithChildren<{ 'data-testid'?: string }>>`. Renders the
shared chrome:

```tsx
<Card.Root border={false} fullWidth classNames={mx('p-1 border-b border-subdued-separator', classNames)} {...}>
  <Card.Body>{children}</Card.Body>
</Card.Root>
```

`Event.Header` → `<Header.Root classNames={editable && 'gap-y-1'}><EventDetails title='heading' …/></Header.Root>`
(`EventDetails` composes `Row.Date`/`Row.Person`/`Row.Ref`). `Message.Header` →
`<Header.Root data-testid='message-header'>` with `Row.Person(role=from)` (sender), `Row.Ref` (extracted
objects), and `Row.Tags` children — the same primitives the tiles use.

`data-testid` and `classNames` must forward (the `MessageArticle` play test queries `message-header`,
`extracted-tags`, `message-tag-*`).

### 3. `components/ObjectArticle/ObjectArticle.tsx` (new)

Presentation-only (composes `Panel` from `@dxos/react-ui`, no app-framework). Props
`{ role, toolbar: ReactNode, header: ReactNode, children: ReactNode }`:

```tsx
<Panel.Root role={role} className='dx-document'>
  <Panel.Toolbar asChild>{toolbar}</Panel.Toolbar>
  <Panel.Content className='grid grid-rows-[auto_1fr]'>
    {header}
    {children}
  </Panel.Content>
</Panel.Root>
```

`EventArticle` and `MessageArticle` keep their own capability hooks/handlers and render through
`ObjectArticle`, passing `Event.Toolbar`/`Message.Toolbar` as `toolbar`, the header element as `header`,
and the body region (Event wraps `Event.Body` in `Event.Viewport`; Message renders `Message.Body`
directly) as children.

### 4. `components/Toolbar/toolbar.ts` (new)

Shared menu-builder group fns mirroring `viewModeGroup`'s `ActionGroupBuilderFn` shape:

- `openGroup({ ns, onOpen, disabled? })` — the `open` action (`ph--arrow-square-out--regular`).
- `deleteGroup({ ns, onDelete })` — the `delete` action (`ph--trash--regular`).

Both `useToolbar` hooks compose these via `.subgraph(...)`. The Event toolbar continues to wrap its
delete inside a `more` dropdown (`moreGroup` may wrap `deleteGroup`, or Event keeps its inline `more`
group calling the shared delete label). Reply/replyAll/forward/load-images/extract stay in
`Message/useToolbar.tsx`; save stays in `Event/useToolbar.tsx`. Contributed `graphActions` wiring and the
`nodeId = Obj.getURI(event)` behaviour from #11830 are preserved.

Translation keys: `open`/`delete` labels are currently per-family (`event-toolbar-open.menu`,
`message-toolbar-open.menu`, etc.). The shared groups take `ns` + explicit label keys so existing keys
are reused (no translation churn); the builder fns accept the label tuples as params.

### 5. Remove `InboxSettings`

- Delete `components/InboxSettings/` (component + barrel) and its `#components` export.
- Remove the `pluginSettings` surface entry and `InboxSettings` import from
  `capabilities/react-surface.tsx`.
- **Keep** the settings _store_ module in `InboxPlugin.tsx` (`SetupSettings` → `activate: InboxSettings`
  store capability contributing `AppCapabilities.Settings` `{ prefix, schema, atom }`). The generic
  settings form surface in `plugin-settings` renders it from the schema automatically (verified pattern;
  see composer-plugins skill 2026-05-31 settings notes).
- Drop the now-unused `settings.title` translation key; keep `plugin.name` and other keys.
- Note the name collision: the `InboxSettings` _store_ capability (`capabilities/`) is distinct from the
  deleted `InboxSettings` _component_.

### 6. Thread → Conversation rename (UI only)

"Thread" is overloaded in the framework (`plugin-thread`, the `Thread.Thread` comment schema). A
**Conversation** is a group of related `Message` objects. Rename the plugin-inbox grouping/UI symbols
only; the `Message.threadId` ECHO field (`@dxos/types`) and Gmail's wire `threadId` (`apis/google/**`,
gmail mapper/send) stay — `threadId` remains the key the grouping reads (`message.threadId ?? message.id`).

Renames (all within `plugin-inbox`):

- `MessageStack.tsx`: `ConversationTile` (component + `ConversationTileData`/`ConversationTileProps`,
  `displayName`, `useMosaicContainer('ConversationTile')`); `threadGroups` → `conversationGroups`; local
  `current-thread` action → `current-conversation`; `MessageStackAction` member
  `{ type: 'current-thread'; threadId }` → `{ type: 'current-conversation'; conversationId }`;
  `handleThreadClick` → `handleConversationClick`; `MessageStackProps.threads` → `conversations`. (Local
  loop vars over the Gmail key may read `message.threadId` but are named `conversationId`/`conversationMessages`.)
- `MailboxArticle.tsx`: `case 'current-thread'` → `case 'current-conversation'`;
  `threads={settings.threads}` → `conversations={settings.conversations}`.
- `types/Settings.ts`: field `threads` → `conversations` (plugin-inbox-owned schema; optional boolean;
  title "Group by conversation"). `capabilities/settings.ts` default `threads: false` → `conversations: false`.
- `MessageStack.stories.tsx`: `WithThreads` story → `WithConversations` (`conversations: true`).
- `meta.ts`: reword the "thread view"/"thread history" copy to "conversation".

Out of scope (unchanged): `apis/google/**`, `operations/google/gmail/**`, `testing/builder.ts` Gmail
mapping (`threadId`), and the `@dxos/types` `Message.threadId` field.

## Storybooks

New:

- `components/Row/Row.stories.tsx` — each `Row.*` primitive standalone (Person with each role + avatar
  variant, Date single/range, Tags, Ref, Star on/off).
- `components/Tile/Tile.stories.tsx` — `Tile.Root` + `Tile.Header` standalone (star on/off, with/without menu).
- `components/ObjectArticle/ObjectArticle.stories.tsx` — scaffold with stub toolbar/header/body slots.
- `components/Header/Header.stories.tsx` — `Header.Root` chrome composing representative `Row.*` (none today).

Update (reflect new tile/header/layout wiring):

- `EventStack.stories.tsx`, `MessageStack.stories.tsx` — tiles now via `Tile.*` + `Row.*`.
- `Event.stories.tsx`, `Message.stories.tsx` — `Header.Root`-based headers composing `Row.*`.
- `MailboxArticle.stories.tsx`, `CalendarArticle.stories.tsx`, `MessageArticle.stories.tsx`,
  `EventArticle.stories.tsx` (add if missing) — render through `ObjectArticle`.

Story sample data uses real `@dxos/types` schema via `@dxos/schema/testing` generators (per skill memory);
ECHO factories live in `useMemo([], …)`/`render`, never module-level `args`.

## File-level change list

- `src/components/Row/{Row.tsx,Row.stories.tsx,index.ts}` — new; row primitives moved out of `Header`
  (`Row.Person` generalized with role/avatar; `Row.Date`/`Row.Tags`/`Row.Ref`/`Row.Star`).
- `src/components/Tile/{Tile.tsx,Tile.stories.tsx,index.ts}` — new.
- `src/components/ObjectArticle/{ObjectArticle.tsx,ObjectArticle.stories.tsx,index.ts}` — new.
- `src/components/Toolbar/{toolbar.ts,index.ts}` — new.
- `src/components/Header/Header.tsx` — reduce to `Header.Root` chrome only (rows moved to `Row`); `Header.stories.tsx` new.
- `src/components/Header/index.ts` — export `Header.Root` only.
- `src/components/Event/EventDetails.tsx` — compose `Row.*`; drop star on the tile (`title={false}`) path; keep on heading path.
- `src/components/EventStack/EventStack.tsx` — `EventTile` uses `Tile.*` + `Row.*`.
- `src/components/MessageStack/MessageStack.tsx` — `MessageTile`/`ConversationTile` use `Tile.*` + `Row.Person(avatar)` (replace hand-rolled `DxAvatar` rows); delete `MessageStackTile`; Thread→Conversation rename.
- `src/types/Settings.ts`, `src/capabilities/settings.ts` — `threads` field → `conversations`.
- `src/meta.ts` — reword thread copy to conversation.
- `src/components/Event/Event.tsx` — `Event.Header` uses `Header.Root`.
- `src/components/Message/Message.tsx` — `Message.Header` uses `Header.Root` + `Row.*` (sender/refs/tags).
- `src/components/Event/useToolbar.tsx`, `src/components/Message/useToolbar.tsx` — compose shared `openGroup`/`deleteGroup`.
- `src/components/index.ts` — export `Row`, `Tile`, `ObjectArticle`, `Toolbar`; drop `InboxSettings`.
- `src/components/InboxSettings/` — delete.
- `src/containers/EventArticle/EventArticle.tsx`, `src/containers/MessageArticle/MessageArticle.tsx` — render via `ObjectArticle`.
- `src/containers/MailboxArticle/MailboxArticle.tsx` — `current-thread`→`current-conversation`, `threads`→`conversations` prop.
- `src/components/MessageStack/MessageStack.stories.tsx` — `WithThreads`→`WithConversations`.
- `src/capabilities/react-surface.tsx` — remove `pluginSettings` surface + `InboxSettings` import.
- `src/translations.ts` — drop `settings.title`.

## Testing

- `moon run plugin-inbox:build`, `:lint -- --fix`, `:test`, `:test-storybook` all green.
- Preserve existing play tests (`MessageArticle` queries `message-header`/`extracted-tags`/`message-tag-*`).
- New `Tile`/`ObjectArticle`/`Header.Root` stories get a minimal smoke render; extend the existing
  article/stack suites rather than adding fragmented new suites where one already covers the area.
- Manual: star toggles on both tile types from the shell; article header/toolbar/body render unchanged;
  generic settings form renders for the inbox settings subject.

## Risks / notes

- **Star ownership move** is the only intentional behaviour change — verify the event tile still toggles
  the Calendar TagIndex star (handler unchanged, only its render location moves).
- `Tile.Root`/`Tile.Header`/`ObjectArticle` must stay free of `useCapability*`/`useAppGraph` so they live
  under `components/` and render in storybook without a PluginManager (composer-plugins rule).
- No compatibility re-exports for `MessageStackTile`/`InboxSettings` — update all call sites in this change.
- Keep `data-testid`/`classNames` forwarding through `Header.Root` and `Tile.*` (`composableProps`).

```

```
