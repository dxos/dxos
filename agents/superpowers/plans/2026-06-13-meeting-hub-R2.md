# Meeting-as-Hub — Plan R2

> REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Design ref: `packages/plugins/plugin-transcription/AUDIT.md`.

**Goal:** Make `Meeting` the hub in practice: (1) strip `transcript`/`notes`/`summary`/`thread` off `Event`; (2) replace inbox's "Create note" with a plugin-meeting-contributed **"Create meeting"** action on the Event menu that creates a `Meeting` + `Meeting --AnchoredTo--> Event`; (3) add **"Start call"** to `MeetingArticle` that provisions a slim `Call`, sets `Meeting.call`, and joins via `CallManager`.

**Architecture:** Cohesive cross-package change (sdk/types + plugin-inbox + plugin-meeting + the story). plugin-inbox stays meeting-agnostic — it only _loses_ the note affordance; the create-meeting action is contributed by plugin-meeting via an app-graph type-extension on `Event.Event` (mirrors how meeting adds actions to Channel nodes).

---

### Task 1: Remove `transcript`/`notes`/`summary`/`thread` from `Event`

**Files:** `packages/sdk/types/src/types/Event.ts`; `packages/plugins/plugin-inbox/src/containers/EventArticle/EventArticle.tsx`; `packages/plugins/plugin-inbox/src/components/Event/{Event.tsx,useToolbar.tsx}`; `packages/plugins/plugin-inbox/src/hooks/shadow.test.ts`; `packages/plugins/plugin-inbox/src/translations*`; `packages/plugins/plugin-meeting/src/stories/EventCall.stories.tsx`.

- [ ] **Step 1:** In `Event.ts` delete the `transcript`, `notes`, `summary`, `thread` fields and the now-unused imports (`Text` from `@dxos/schema`, `Thread`, `Transcript`). Keep everything else.
- [ ] **Step 2:** In `EventArticle.tsx` remove the create-note flow: `handleNoteCreate`, the `notes` reads (shadowedEvent.notes / event.notes.load), the notes `Surface.Section` render block, and the `onNoteCreate` prop passed to `Event.Toolbar`. If `useShadowObject`/`createShadowEvent` is now unused here, remove its usage from this file (leave the hook itself in place). Remove the now-unused `Text`/`Ref` imports if orphaned.
- [ ] **Step 3:** In `components/Event/Event.tsx` + `useToolbar.tsx` remove the `onNoteCreate` prop and the `createNote` menu action; remove the `event-toolbar-create-note.menu` translation key from inbox translations.
- [ ] **Step 4:** Fix `shadow.test.ts`: it asserts shadow re-anchor via `Event.notes`. Rework it to exercise the shadow hook against a still-present writable field (or a small test-only schema) so it no longer depends on `Event.notes`. Keep the hook's behavior covered.
- [ ] **Step 5:** In the `EventCall` story, remove the `eventNotes` Text + `notes: Ref.make(eventNotes)` from the seeded `Event` (the Meeting already owns notes). Leave the Meeting seed intact.
- [ ] **Step 6:** Build gates: `moon run types:build`, `moon run plugin-inbox:build`, `moon run plugin-meeting:build`. Repo-wide grep to confirm no remaining Event-field reads: `grep -rn "\.thread\b" packages --include='*.ts*' | grep -i event` etc. Commit: `refactor(types): remove transcript/notes/summary/thread from Event (moved to Meeting)`.

---

### Task 2: plugin-meeting "Create meeting" action on the Event menu (+ AnchoredTo)

**Files:** `packages/plugins/plugin-meeting/src/types/MeetingOperation.ts` + `operations/create.ts`; `packages/plugins/plugin-meeting/src/capabilities/app-graph-builder.ts`; a query helper (e.g. `src/util` or `#types`); translations.

- [ ] **Step 1:** Extend `MeetingOperation.Create` input with an optional `event?: Ref<Event>` (Event from `@dxos/types`). In `operations/create.ts`, after creating the `Meeting`, when `event` is provided create the relation: `Relation.make(AnchoredTo.AnchoredTo, { [Relation.Source]: meeting, [Relation.Target]: eventTarget })` and write it to the space. (Occurrence keying is deferred — plain relation for now.) Import `AnchoredTo` from `@dxos/types`.
- [ ] **Step 2:** Add a query helper `getMeetingForEvent(db, event): Meeting | undefined` — query `AnchoredTo` relations targeting the event whose source is a `Meeting` (follow the `plugin-comments` AnchoredTo query pattern). Export it from `#types` or a `util` barrel.
- [ ] **Step 3:** In plugin-meeting `app-graph-builder.ts`, add a `GraphBuilder` type-extension on `Event.Event` contributing a **"Create meeting"** action whose invoke calls `MeetingOperation.Create({ space, event: Ref.make(event) })`. Gate it so it only shows when `getMeetingForEvent` returns nothing (else offer "Open meeting"/navigate). Add the `create-meeting.label` translation (reuse existing meeting translation keys where present).
- [ ] **Step 4:** `moon run plugin-meeting:build` + `:lint --fix` + `:test`. Commit: `feat(plugin-meeting): Create-meeting action on Event nodes + AnchoredTo relation`.

---

### Task 3: "Start call" from MeetingArticle

**Files:** `packages/plugins/plugin-meeting/src/containers/MeetingArticle/MeetingArticle.tsx`; possibly a small `startCall`/`provisionCall` helper.

- [ ] **Step 1:** Add a "Start call" affordance to `MeetingArticle` (toolbar/header button, `ph--phone-call--regular`). On click: if `meeting.call` is unset, create a slim `Call` via `Call.make({ name: meeting.name, transport: { kind: 'org.dxos.call.transport.cloudflare', config: Ref.make(<config obj>) } })` (the config object is a placeholder until the real `CallTransportProvider.makeConfig` lands in R4 — create a minimal Obj holding a room id derived from the Meeting DXN), add it to the space, and set `meeting.call = Ref.make(call)`.
- [ ] **Step 2:** Then join the live session via `CallsCapabilities.Manager` (`useCapability` → `callManager.setRoomId(roomId)` + `join()`), mirroring how the call was started from a Channel previously. If the manager isn't available (e.g. plugin-calls not registered), no-op gracefully.
- [ ] **Step 3:** `moon run plugin-meeting:build` + `:lint --fix`. Commit: `feat(plugin-meeting): Start-call action on MeetingArticle (provision Call + join)`.

---

### Task 4: Verify + finalize

- [ ] **Step 1:** `moon run types:build && moon run plugin-inbox:build && moon run plugin-calls:build && moon run plugin-meeting:build && moon run composer-app:build` all PASS.
- [ ] **Step 2:** `moon run plugin-inbox:test && moon run plugin-meeting:test` PASS. `pnpm format`. Cast audit (`git diff origin/main | grep -nE '\bas (any|unknown|[A-Z])|as unknown as'`) — no new casts.
- [ ] **Step 3:** The `EventCall` story builds; left pane (Event, no notes section now) + right pane (MeetingArticle) render. Commit any formatting.

---

## Self-review

- **Coverage:** Event field removal (Task 1) ✓; create-meeting-from-Event-menu + AnchoredTo (Task 2) ✓; start-call-from-MeetingArticle (Task 3) ✓; story updated (Task 1.5) ✓.
- **Deferred:** occurrence keying on the relation (R5/recurrence); the real Cloudflare `CallTransportProvider.makeConfig` (R4); Meeting-aware tabbed companion + precedence + Notes/Transcript/Summary tabs (R3); `transcriptDxn` casing fix + real `summarizeMeeting` (R3).
- **Coupling:** plugin-inbox does NOT gain a plugin-meeting dep — it only removes the note affordance; the create-meeting action is contributed BY plugin-meeting onto Event nodes. plugin-meeting → {plugin-calls, plugin-transcription, @dxos/types} (all existing).
- **Risk:** `shadow.test.ts` rework (Task 1.4) — if `useShadowObject` is now unused repo-wide, flag it (don't delete the hook in this plan). The `Call.transport.config` placeholder (Task 3) is intentional scaffolding until R4.
