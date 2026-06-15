# Inbox shared components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Factor the duplicated Event/Message presentation in `plugin-inbox` into one shared set of primitives (`Row.*` Card rows, `Tile.*` mosaic shell, `Header.Root` chrome, `ObjectArticle` scaffold, shared toolbar groups), rename the inbox "thread" grouping to "conversation", and drop the bespoke `InboxSettings` surface.

**Architecture:** Presentation-only components in `src/components/` (no app-framework deps) compose `@dxos/react-ui` `Card`/`Panel`/`Mosaic`. Containers in `src/containers/` keep their capability hooks and render through the shared components. Design source of truth: `docs/superpowers/specs/2026-06-15-inbox-shared-components-design.md`.

**Tech Stack:** React + TypeScript, `@dxos/react-ui`, `@dxos/react-ui-mosaic`, `@dxos/react-ui-menu`, moon, vitest + storybook.

**Verification per task (unless noted):**

- `moon run plugin-inbox:lint -- --fix`
- `moon run plugin-inbox:build`
- Cast audit: `git diff origin/main | grep -nE '\bas (any|unknown|[A-Z])|as unknown as'` → justify/remove.
- Final tasks add `moon run plugin-inbox:test` and `:test-storybook`.

---

### Task 1: `Row.*` shared Card-row primitives

**Files:**

- Create: `src/components/Row/Row.tsx`, `src/components/Row/index.ts`, `src/components/Row/Row.stories.tsx`
- Source to move from: `src/components/Header/Header.tsx` (`DateRow`, `ObjectRow`, `PersonRow`, `TagsRow`, `StarButton`, internal `AnchorIconButton`)

- [ ] **Step 1: Create `Row.tsx`** — move `AnchorIconButton` (internal), and the five rows, renaming to the `Row` namespace per spec §0:
  - `Row.Date` ← `HeaderDateRow` (accept optional single date: make `start: Date`, `end?: Date` as today).
  - `Row.Ref` ← `HeaderObjectRow` (prop `object`).
  - `Row.Person` ← `HeaderPersonRow`, generalized: add `role?: 'from'|'to'|'cc'|'bcc'|'attendee'` and `avatar?: boolean`. When `avatar`, render a `DxAvatar` (`@dxos/lit-ui/react`) in the leading `Card.Block` (hue via `getHashStyles`/`getMessageProps` caller-supplied) instead of the contact-anchor icon; otherwise unchanged (contact anchor + create/remove). `role` sets the icon/aria label only (no visible prefix).
  - `Row.Tags` ← `HeaderTagsRow`.
  - `Row.Star` ← `HeaderStarButton`.
  - Export `export const Row = { Person, Date, Tags, Ref, Star };` and the prop types.
- [ ] **Step 2: `index.ts`** — `export * as Row from './Row';` (namespace) OR `export { Row } from './Row';` to match sibling barrels (check `components/Header/index.ts` style; Header uses `export { Header } from './Header';` — mirror it).
- [ ] **Step 3: `Row.stories.tsx`** — one story per primitive (Person each role + avatar, Date single/range, Tags, Ref, Star on/off), each rendered inside a `Card.Root`/`Card.Body`. ECHO actors built in `render`/`useMemo([], …)`, never module args.
- [ ] **Step 4: Reduce `Header.tsx` to `Header.Root` only** (Task 2 adds Root); for now delete the moved rows from `Header.tsx` and leave the file exporting nothing-yet (Task 2 immediately follows). To keep the build green between tasks, do Task 1+2 as one commit if `Header` ends up empty.
- [ ] **Step 5: Verify lint+build**, cast audit.
- [ ] **Step 6: Commit** `refactor(plugin-inbox): extract shared Row.* Card-row primitives`.

### Task 2: `Header.Root` chrome

**Files:**

- Modify: `src/components/Header/Header.tsx`, `src/components/Header/index.ts`
- Create: `src/components/Header/Header.stories.tsx`

- [ ] **Step 1:** Replace `Header.tsx` body with `Header.Root` only (spec §2): `Card.Root border={false} fullWidth classNames={mx('p-1 border-b border-subdued-separator', classNames)}` + `Card.Body`, forwarding `data-testid`/`classNames`. `export const Header = { Root };`.
- [ ] **Step 2:** `Header.stories.tsx` — `Header.Root` composing a few `Row.*` children.
- [ ] **Step 3:** Verify lint+build; commit `refactor(plugin-inbox): reduce Header to borderless-card Header.Root` (may be squashed with Task 1).

### Task 3: `Tile.*` shell

**Files:**

- Create: `src/components/Tile/Tile.tsx`, `src/components/Tile/index.ts`, `src/components/Tile/Tile.stories.tsx`

- [ ] **Step 1:** `Tile.Root` (forwardRef) = `Mosaic.Tile asChild classNames={TILE_CLASSNAMES} → Focus.Item asChild → Card.Root fullWidth border={false}`, props `{ id, data, location, current, onCurrentChange, onClick?, classNames?, children }`. Move `TILE_CLASSNAMES` const here (single source).
- [ ] **Step 2:** `Tile.Header` = `Card.Header` with `Card.Block` › `Row.Star`, `Card.Title` slot for `title`, `Card.Menu` when `menu`. Props `{ starred?, onToggleStar?, title, menu? }`.
- [ ] **Step 3:** `index.ts` mirror sibling barrel; `Tile.stories.tsx` smoke story (must mount inside `Mosaic.Container` + `Focus.Group` — see `EventStack` usage — or render `Tile.Header` standalone for the no-mosaic variant).
- [ ] **Step 4:** Verify lint+build; cast audit; commit `feat(plugin-inbox): add shared Tile.* mosaic shell`.

### Task 4: EventStack/EventTile + EventDetails adopt Row/Tile

**Files:**

- Modify: `src/components/EventStack/EventStack.tsx`, `src/components/Event/EventDetails.tsx`

- [ ] **Step 1:** `EventDetails.tsx` — import `Row` (was `Header`). Replace `Header.StarButton`→`Row.Star`, `Header.DateRow`→`Row.Date`, `Header.PersonRow`→`Row.Person` (attendees `role='attendee'`). On `title='heading'` keep the star; on the tile path callers pass `title={false}` and the star is omitted (it now lives in `Tile.Header`).
- [ ] **Step 2:** `EventStack.tsx` — `EventTile` renders `Tile.Root` › `Tile.Header(starred, onToggleStar, title=event title)` + `Card.Body` › `EventDetails(title=false, maxAttendees=8)`. Remove the inlined `Mosaic.Tile→Focus.Item→Card.Root` + local `TILE_CLASSNAMES`.
- [ ] **Step 3:** Verify lint+build; update `EventStack.stories.tsx` if it asserts removed markup; commit `refactor(plugin-inbox): EventTile/EventDetails use Row.* + Tile.*`.

### Task 5: MessageStack tiles adopt Row/Tile + Thread→Conversation rename

**Files:**

- Modify: `src/components/MessageStack/MessageStack.tsx`, `src/components/MessageStack/MessageStack.stories.tsx`

- [ ] **Step 1: Rename (UI symbols only)** in `MessageStack.tsx`:
  - `ThreadTile`→`ConversationTile` (+ `ThreadTileData`/`ThreadTileProps`→`Conversation*`, `displayName`, `useMosaicContainer('ConversationTile')`).
  - `threadGroups`→`conversationGroups`; loop vars→`conversationId`/`conversationMessages` (key still reads `message.threadId ?? message.id`).
  - `MessageStackProps.threads`→`conversations`; the `Tile={threads ? ... }` switch uses `conversations`.
  - `MessageStackAction` `{ type: 'current-thread'; threadId }`→`{ type: 'current-conversation'; conversationId }`; `handleThreadClick`→`handleConversationClick`.
- [ ] **Step 2:** Delete `MessageStackTile`; `MessageTile` and `ConversationTile` render via `Tile.Root` + `Tile.Header`. `MessageTile` body uses `Row.Person(avatar, role='from')` for the from row (replacing hand-rolled `DxAvatar`+`Card.Text`) and `Row.Tags`. `ConversationTile` body uses per-message `Row.Person(avatar)` rows.
- [ ] **Step 3:** `MessageStack.stories.tsx` — `WithThreads`→`WithConversations` (`conversations: true`).
- [ ] **Step 4:** Verify lint+build; cast audit (watch the `as any` on `Tile=`/`items=` — keep only if pre-existing and unavoidable for the Mosaic generic; prefer typing the tile union); commit `refactor(plugin-inbox): MessageStack tiles use Row.*/Tile.*; rename Thread→Conversation`.

### Task 6: MailboxArticle + Settings rename follow-through

**Files:**

- Modify: `src/containers/MailboxArticle/MailboxArticle.tsx`, `src/types/Settings.ts`, `src/capabilities/settings.ts`, `src/meta.ts`

- [ ] **Step 1:** `MailboxArticle.tsx` — `case 'current-thread'`→`case 'current-conversation'` (read `action.conversationId`); `threads={settings.threads}`→`conversations={settings.conversations}`.
- [ ] **Step 2:** `Settings.ts` — field `threads`→`conversations`, title `'Group by conversation'`, keep description. `settings.ts` default `threads: false`→`conversations: false`.
- [ ] **Step 3:** `meta.ts` — reword "thread view"/"thread history" copy to "conversation".
- [ ] **Step 4:** Verify lint+build; commit `refactor(plugin-inbox): finish Thread→Conversation rename (settings, mailbox, meta)`.

### Task 7: `Event.Header`/`Message.Header` use `Header.Root` + `Row.*`

**Files:**

- Modify: `src/components/Event/Event.tsx`, `src/components/Message/Message.tsx`

- [ ] **Step 1:** `Event.tsx` `EventHeader` — wrap `EventDetails` in `Header.Root` (`classNames={editable && 'gap-y-1'}`) instead of hand-rolled `Card.Root`/`Card.Body`.
- [ ] **Step 2:** `Message.tsx` `MessageHeader` — wrap rows in `Header.Root data-testid='message-header'`; replace `Header.StarButton`→`Row.Star`, `Header.PersonRow`→`Row.Person(role='from')`, `Header.ObjectRow`→`Row.Ref`, `Header.TagsRow`→`Row.Tags`. Preserve the subject row markup + `created` date. Keep `data-testid` `extracted-tags`/`message-tag-*`.
- [ ] **Step 3:** Verify lint+build; commit `refactor(plugin-inbox): article headers use Header.Root + Row.*`.

### Task 8: `ObjectArticle` scaffold + EventArticle/MessageArticle

**Files:**

- Create: `src/components/ObjectArticle/ObjectArticle.tsx`, `src/components/ObjectArticle/index.ts`, `src/components/ObjectArticle/ObjectArticle.stories.tsx`
- Modify: `src/containers/EventArticle/EventArticle.tsx`, `src/containers/MessageArticle/MessageArticle.tsx`

- [ ] **Step 1:** `ObjectArticle.tsx` — props `{ role, toolbar, header, children }`, renders the spec §3 Panel scaffold.
- [ ] **Step 2:** `EventArticle.tsx` — render through `ObjectArticle` (toolbar=`Event.Toolbar`, header=`Event.Header`, body=`Event.Viewport`›`Event.Body`).
- [ ] **Step 3:** `MessageArticle.tsx` — render through `ObjectArticle` (toolbar=`Message.Toolbar`, header=`Message.Header`, body=`Message.Body`).
- [ ] **Step 4:** `ObjectArticle.stories.tsx` — stub slots.
- [ ] **Step 5:** Verify lint+build; commit `refactor(plugin-inbox): share ObjectArticle layout for Event/Message articles`.

### Task 9: Shared toolbar groups

**Files:**

- Create: `src/components/Toolbar/toolbar.ts`, `src/components/Toolbar/index.ts`
- Modify: `src/components/Event/useToolbar.tsx`, `src/components/Message/useToolbar.tsx`

- [ ] **Step 1:** `toolbar.ts` — `openGroup({ ns, labelKey, onOpen, disabled? })` and `deleteGroup({ ns, labelKey, onDelete })` returning `ActionGroupBuilderFn` (mirror `viewModeGroup`). Pass label keys as params so existing per-family keys are reused.
- [ ] **Step 2:** `Message/useToolbar.tsx` — compose `openGroup`/`deleteGroup` (reuse `message-toolbar-open.menu`/`message-toolbar-delete.menu`); keep reply/replyAll/forward/load-images/extract local.
- [ ] **Step 3:** `Event/useToolbar.tsx` — compose `openGroup` (`event-toolbar-open.menu`, `disabled: editing`); keep `save`; the `more` dropdown wraps a call to the shared delete action (`event-toolbar-delete.menu`). Preserve `nodeId = Obj.getURI(event)` and `graphActions`.
- [ ] **Step 4:** Verify lint+build; commit `refactor(plugin-inbox): share open/delete toolbar groups`.

### Task 10: Remove `InboxSettings`

**Files:**

- Delete: `src/components/InboxSettings/`
- Modify: `src/capabilities/react-surface.tsx`, `src/components/index.ts`, `src/translations.ts`, `src/InboxPlugin.tsx` (only if it imports the component — it imports the store; leave the store module)

- [ ] **Step 1:** Verify the inbox settings store contributes `{ schema }` (read `src/capabilities/settings.ts`); confirm plugin-settings' generic surface renders schema-driven settings (`packages/plugins/plugin-settings/src/capabilities/react-surface.tsx`). If the store lacks a schema, add it (the `Settings.Settings` schema) rather than keeping a custom surface.
- [ ] **Step 2:** Remove the `pluginSettings` surface entry + `InboxSettings` import in `react-surface.tsx`.
- [ ] **Step 3:** Delete `components/InboxSettings/`; drop its `components/index.ts` export; ensure `InboxPlugin.tsx` still references only the settings _store_ capability (named import distinct from the component).
- [ ] **Step 4:** `translations.ts` — drop unused `settings.title`; keep `plugin.name`/field titles.
- [ ] **Step 5:** Verify lint+build; commit `refactor(plugin-inbox): drop custom InboxSettings; use generic settings surface`.

### Task 11: barrels, stories, full verification

**Files:**

- Modify: `src/components/index.ts` (export `Row`, `Tile`, `ObjectArticle`, `Toolbar`), `#components` `package.json` imports if needed, and any container/component stories listed in spec.

- [ ] **Step 1:** Update `components/index.ts` exports; confirm `package.json` `#components` + `moon.yml` entrypoints unaffected (no barrel removed; `InboxSettings` was internal to the barrel).
- [ ] **Step 2:** Update stories per spec: `EventStack`/`MessageStack`, `Event`/`Message`, `MailboxArticle`/`CalendarArticle`/`MessageArticle`, add `EventArticle.stories.tsx` if useful. Keep existing play-test `data-testid` queries working.
- [ ] **Step 3:** Full verify: `moon run plugin-inbox:lint -- --fix`, `:build`, `:test`, `:test-storybook` (reuse storybook on :9009 or another port; never kill the user's). Final cast audit over the whole diff.
- [ ] **Step 4:** Commit `test(plugin-inbox): stories for shared components; finalize barrels`.

### Task 12: PR

- [ ] **Step 1:** Merge `origin/main`, resolve conflicts, `pnpm format`, re-run lint/build/test.
- [ ] **Step 2:** Push branch; open **draft** PR titled `refactor(plugin-inbox): shared Event/Message components + Thread→Conversation`; body summarizes the change, links the spec, notes the star-ownership move + settings field rename. Do NOT add to merge queue.
- [ ] **Step 3:** Monitor CI (`gh run list --branch <branch> --workflow "Check"`); fix failures at root cause. Surface Composer preview URL in the summary.

```

```
