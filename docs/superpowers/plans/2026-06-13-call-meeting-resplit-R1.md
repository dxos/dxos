# Call/Meeting Re-split — Plan R1 (supersedes P1's merge)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.
> **Design source of truth:** `packages/plugins/plugin-transcription/AUDIT.md` (Domain model, Schema, Relations, Surfaces, "Attaching a Meeting"). Read it first.

**Goal:** Split the post-P1 merged `plugin-calls` into two plugins matching the agreed model: a slim, meeting-agnostic **`plugin-calls`** (persistent `Call` = transport only, `CallManager`, live video grid) and a **`plugin-meeting`** hub (`Meeting` = notes/summary/transcript/participants/`call?`, `AnchoredTo` Event).

**Why this supersedes P1:** P1 merged plugin-meeting into plugin-calls and made `Call` the hub. The agreed model (a `Call` is independently usable from chat; a `Meeting` can exist with no call / in-person) requires them separate. We keep P1's durable wins — **`@dxos/av`**, **transcription no longer depends on plugin-calls**, the **plugin merge mechanics as reference** — and reverse the type/plugin coupling.

**Architecture:** Forward refactor (no git history surgery). Create `plugin-meeting`; move the hub type + ops + record UI + summarize + transcription orchestration there (renaming `Call*`→`Meeting*`); leave `plugin-calls` with the runtime + live video, replacing its hub `Call` with a slim transport-only `Call`; re-register both plugins. `plugin-meeting → {plugin-calls, plugin-transcription}`.

**Tech stack:** TypeScript, Effect, `@dxos/app-framework`/`app-toolkit`, ECHO schema, moon, vitest.

---

## Naming map

| Post-P1 (plugin-calls)                                                                                                                                           | Target                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `Call` (hub: name/created/participants/transcript/notes/summary)                                                                                                 | `Meeting` in **plugin-meeting** (same fields **+ `call?: Ref<Call>`**, DXN `org.dxos.type.meeting`)                  |
| — (no transport today)                                                                                                                                           | **new** slim `Call` in **plugin-calls**: `{ name?, created, transport: { kind, config } }`, DXN `org.dxos.type.call` |
| `CallOperation` (Create/SetActive/HandlePayload/Summarize)                                                                                                       | `MeetingOperation.*` in plugin-meeting                                                                               |
| `CallsCapabilities.{Settings,RecordState}`                                                                                                                       | `MeetingCapabilities.{Settings,State}` in plugin-meeting                                                             |
| `CallRecordState`/`CallRecordStore`, `activeCall`                                                                                                                | `MeetingState`/`MeetingStore`, `activeMeeting`                                                                       |
| `containers/CallArticle` (record: notes+summary)                                                                                                                 | `MeetingArticle` in plugin-meeting                                                                                   |
| `containers/CallsList`                                                                                                                                           | `MeetingsList` in plugin-meeting                                                                                     |
| `summarize.ts` (`getCallContent`)                                                                                                                                | plugin-meeting `summarize.ts` (`getMeetingContent`)                                                                  |
| `capabilities/{operation-handler,call-extension,settings,state}`                                                                                                 | plugin-meeting capabilities                                                                                          |
| (kept in plugin-calls) `CallManager`, `calls/`, `components/{Call,Lobby,Media,Participant,ResponsiveGrid}`, `CallsCapabilities.{Manager,EventHandler}`, `hooks/` | unchanged                                                                                                            |
| **new** `plugin-calls` `CallArticle`                                                                                                                             | the **live video grid** surface for a `Call` object (reuse `components/Call` + `CallSidebar`)                        |

Keep DXN `org.dxos.type.call` for the new slim `Call` (no migration concern — labs).

---

### Task 1: Scaffold `plugin-meeting` package

**Files:** `packages/plugins/plugin-meeting/{package.json, moon.yml, tsconfig.json, vitest.config.ts, LICENSE, README.md, src/{index.ts, meta.ts}}`

- [ ] **Step 1:** Use `packages/plugins/plugin-chess` as the structural template (a full plugin). Create `plugin-meeting/package.json` with `"private": true`, `name: "@dxos/plugin-meeting"`, `type: module`, `#imports` aliases (`#capabilities`,`#components`,`#containers`,`#meta`,`#operations`,`#translations`,`#types`,`#plugin`), `exports` (`.`,`./plugin`,`./translations`,`./types`), and `dependencies` (workspace `@dxos/*`): `@dxos/app-framework`, `@dxos/app-toolkit`, `@dxos/ai`, `@dxos/assistant`, `@dxos/compute`, `@dxos/echo`, `@dxos/effect`, `@dxos/invariant`, `@dxos/keys`, `@dxos/log`, `@dxos/plugin-calls`, `@dxos/plugin-client`, `@dxos/plugin-graph`, `@dxos/plugin-space`, `@dxos/plugin-transcription`, `@dxos/protocols`, `@dxos/react-client`, `@dxos/react-ui`, `@dxos/react-ui-attention`, `@dxos/react-ui-form`, `@dxos/react-ui-list`, `@dxos/react-ui-stack`, `@dxos/react-ui-theme`, `@dxos/schema`, `@dxos/types`, `@dxos/util`; external `catalog:`: `@effect-atom/atom-react`, `@effect/ai`, `effect`, `react`, `react-dom`.
- [ ] **Step 2:** `moon.yml` mirrors plugin-chess (`compile` entryPoints for index/meta/capabilities/components/containers/operations/translations/types/plugin; tags incl. `ts-build`,`ts-test`).
- [ ] **Step 3:** `src/meta.ts` — `Plugin.Meta` `{ id: 'org.dxos.plugin.meeting', name: 'Meeting', ... icon, iconHue }` (copy the old meeting meta values; `tags: ['labs']`).
- [ ] **Step 4:** Minimal `src/index.ts` (`export { meta } from './meta'; export { MeetingPlugin } from './MeetingPlugin';` — MeetingPlugin added in Task 6).
- [ ] **Step 5:** `CI=true pnpm install`. Add `@dxos/plugin-meeting` to root `tsconfig.paths.json`, `tsconfig.all.json`, `release-please-config.json` (mirror a sibling plugin).
- [ ] **Step 6:** Commit: `chore(plugin-meeting): scaffold package`.

---

### Task 2: Move the hub type → `Meeting` (+ `call?` ref)

**Files:** create `plugin-meeting/src/types/{Meeting.ts, MeetingOperation.ts, MeetingCapabilities.ts, Settings.ts, index.ts}`; delete the same from plugin-calls (`types/Call.ts`, `CallOperation.ts`, `Settings.ts`; trim `CallsCapabilities.ts`).

- [ ] **Step 1:** Move `plugin-calls/src/types/Call.ts` → `plugin-meeting/src/types/Meeting.ts`. Rename `Call`→`Meeting`, DXN `org.dxos.type.call`→`org.dxos.type.meeting`. Keep fields; **add** `call: Ref.Ref(Call.Call).pipe(FormInputAnnotation.set(false), Schema.optional)` importing the slim `Call` from `@dxos/plugin-calls` (created in Task 5 — if not yet present, stub the field and wire after Task 5; build gate at Task 6). Keep the `make()` factory; add `call?` param.
- [ ] **Step 2:** Move `CallOperation.ts` → `MeetingOperation.ts` (rename symbol; op `meta.key` `…calls.operation.*` → `…meeting.operation.*`). Move `Settings.ts` verbatim.
- [ ] **Step 3:** Move the meeting capability keys out of plugin-calls `CallsCapabilities.ts` into `plugin-meeting/src/types/MeetingCapabilities.ts`: `Settings`, `State` (rename `RecordState`→`State`; types `CallRecordState`/`CallRecordStore`→`MeetingState`/`MeetingStore`; field `activeCall`→`activeMeeting`). **Leave** `Manager`, `EventHandler`, (and `CallTransportProvider` if present) in plugin-calls `CallsCapabilities.ts`.
- [ ] **Step 4:** `plugin-meeting/src/types/index.ts`: `export * as Meeting from './Meeting'; export * as MeetingOperation from './MeetingOperation'; export * as MeetingCapabilities from './MeetingCapabilities'; export * as Settings from './Settings';`. Remove the corresponding exports from plugin-calls `types/index.ts` (keep `CallsCapabilities`, and `Call` after Task 5).
- [ ] **Step 5:** Commit: `feat(plugin-meeting): add Meeting hub type + operations + capabilities`.

---

### Task 3: Move operations + capabilities + record UI + summarize + translations → plugin-meeting

**Files:** move from plugin-calls to plugin-meeting: `operations/{create,set-active,handle-payload,summarize,index}.ts`; `capabilities/{operation-handler,call-extension,settings,state}.ts`; `containers/CallArticle`→`MeetingArticle`, `containers/CallsList`→`MeetingsList`; `summarize.ts`; the meeting strings from `translations.ts`; the 4 meeting app-graph extensions and the Call-record surfaces.

- [ ] **Step 1:** Move `operations/` to plugin-meeting; apply naming map (`CallOperation`→`MeetingOperation`, `Call.Call`→`Meeting.Meeting` via `Meeting.make`, `RecordState`→`State`, `activeCall`→`activeMeeting`, `CallOperationHandlerSet`→`MeetingOperationHandlerSet`). `summarize.ts` handler stays a stub (real wiring is a later plan). Add `#operations` alias + moon entrypoint to plugin-meeting.
- [ ] **Step 2:** Move `capabilities/{operation-handler,call-extension,settings,state}.ts` to plugin-meeting; naming map; `call-extension.ts` imports `CallsCapabilities` from `@dxos/plugin-calls/types` and `TranscriptionCapabilities` from `@dxos/plugin-transcription`. Build the plugin-meeting `capabilities/index.ts` lazies (`AppGraphBuilder`, `OperationHandler`, `CallExtension`, `MeetingSettings`, `MeetingState`, `ReactSurface`).
- [ ] **Step 3:** Move `containers/CallArticle`→`plugin-meeting/src/containers/MeetingArticle` (rename `CallArticle`→`MeetingArticle`, `Call.Call`→`Meeting.Meeting`) and `CallsList`→`MeetingsList`. Move `summarize.ts` (`getCallContent`→`getMeetingContent`).
- [ ] **Step 4:** Move the 4 meeting app-graph extensions (shareCallLink, callCompanion, callTranscript, the Meeting transcript companion) out of plugin-calls `capabilities/app-graph-builder.ts` into plugin-meeting's; **leave** plugin-calls's original `activeCall`/`channelChatCompanion`. Move the Call-record article + companion `Surface.create`s out of plugin-calls `react-surface.tsx` into plugin-meeting's (filter on `Meeting.Meeting`); **leave** plugin-calls `activeCallCompanion`/`devtoolsOverview`.
- [ ] **Step 5:** Move the meeting translation keys out of plugin-calls `translations.ts` into `plugin-meeting/src/translations.ts` (re-key the typename block to `Meeting.Meeting`).
- [ ] **Step 6:** Commit: `feat(plugin-meeting): move operations, capabilities, record UI, summarize, translations`.

---

### Task 4: Wire `MeetingPlugin`

**Files:** `plugin-meeting/src/MeetingPlugin.ts`, `src/plugin.ts`, `src/index.ts`.

- [ ] **Step 1:** Author `MeetingPlugin` `.pipe()` mirroring the old meeting plugin (AppGraphModule, OperationHandlerModule, `addSchemaModule({ schema: [Meeting.Meeting] })`, SurfaceModule, TranslationsModule, Settings module, State module, CallExtension module, plugin-asset). Use the post-P1 `CallsPlugin.tsx` meeting wiring as the reference.
- [ ] **Step 2:** `src/plugin.ts` re-exports `MeetingPlugin` + `MeetingOperationHandlerSet`. `src/index.ts` exports `meta` + `MeetingPlugin`.
- [ ] **Step 3:** `moon run plugin-meeting:build` — expect failures only from the not-yet-slim `Call` import (resolved Task 5). Fix all other errors.
- [ ] **Step 4:** Commit: `feat(plugin-meeting): wire MeetingPlugin`.

---

### Task 5: Slim `Call` in plugin-calls (transport) + `CallArticle` = video grid

**Files:** rewrite `plugin-calls/src/types/Call.ts`; add `CallTransport` + `CallTransportProvider` per AUDIT/PLUGIN.mdl; repoint `containers/CallArticle` to the live grid; fix `CallsPlugin.tsx`.

- [ ] **Step 1:** Replace `plugin-calls/src/types/Call.ts` with the slim type:

```ts
export const Call = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  created: Schema.String.pipe(FormInputAnnotation.set(false)),
  transport: CallTransport, // { kind: string, config: Ref<Obj.Unknown> }
}).pipe(
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({ icon: 'ph--phone-call--regular', hue: 'indigo' }),
  Type.makeObject(DXN.make('org.dxos.type.call', '0.1.0')),
);
```

Define `CallTransport` (`{ kind, config: Ref.Ref(Obj.Unknown) }`) and a `make()` that takes `{ name?, transport }`. Keep `Call` exported from `types/index.ts`.

- [ ] **Step 2:** Add `CallsCapabilities.CallTransportProvider` (key + `CallTransportProvider` interface type) per PLUGIN.mdl. (Implementing the Cloudflare provider is a later plan; the key + type are enough here.)
- [ ] **Step 3:** Make `plugin-calls/src/containers/CallArticle` render the **live video grid** for a `Call` (compose `components/Call` / `CallSidebar` / `ParticipantGrid`), replacing the moved-out record view. Its surface filter: `AppSurface.object(AppSurface.Article, Call.Call)`.
- [ ] **Step 4:** Trim `CallsPlugin.tsx`: remove the meeting modules (OperationHandler/Settings/State/CallExtension/meeting schema); keep AppGraphBuilder, ReactRoot, ReactSurface, CallManager module, translations; `addSchemaModule({ schema: [Call.Call] })` for the slim Call. Remove `operations/`, `summarize.ts`, `containers/CallsList`, and meeting capability files from plugin-calls (now in plugin-meeting). Remove now-unused deps from plugin-calls `package.json` (ai/assistant if only used by summarize).
- [ ] **Step 5:** `moon run plugin-calls:build` + `moon run plugin-meeting:build` PASS. Lint both with `--fix`.
- [ ] **Step 6:** Commit: `feat(plugin-calls): slim Call (transport) + CallArticle video grid`.

---

### Task 6: Register `plugin-meeting` in composer-app + finalize

**Files:** `composer-app/src/plugin-defs.tsx`, `composer-app/package.json`, `composer-app/tsconfig.json`.

- [ ] **Step 1:** Re-add `MeetingPlugin` to `plugin-defs.tsx` (import from `@dxos/plugin-meeting/plugin`, add to labs defaults + `getPlugins()`), alongside the existing `CallsPlugin`. Add `@dxos/plugin-meeting` workspace dep + tsconfig reference to composer-app.
- [ ] **Step 2:** `moon run plugin-calls:build && moon run plugin-meeting:build && moon run composer-app:build` PASS.
- [ ] **Step 3:** Port the plugin test: `plugin-meeting/src/MeetingPlugin.test.ts` (from plugin-calls `CallsPlugin.test.ts`, the meeting assertions); trim plugin-calls test to the slim-Call assertions. Both `:test` PASS.
- [ ] **Step 4:** Update `plugin-calls/src/stories/EventCall.stories.tsx`: seed a `Meeting` (hub, with notes/summary/transcript) instead of the old hub `Call`; register `MeetingPlugin`; the right pane resolves the Meeting-aware companion. (Full companion redesign is a later plan; here just keep the story green and rendering.)
- [ ] **Step 5:** `pnpm format`; cast audit `git diff origin/main | grep -nE '\bas (any|unknown|[A-Z])|as unknown as'` (no new). Commit: `refactor: re-split plugin-meeting from plugin-calls (Meeting hub + slim Call)`.

---

## Self-review

- **Coverage vs AUDIT:** two plugins ✓ (Tasks 1,5,6); `Meeting` hub with `call?` ✓ (Task 2); slim `Call`+transport ✓ (Task 5); `CallArticle`=video ✓ (Task 5); transcription orchestration in plugin-meeting ✓ (Task 3). **Deferred to later plans:** `Meeting --AnchoredTo--> Event` + occurrence + "Attach Meeting" op (R2); Meeting-aware tabbed companion + precedence + EventArticle Description/Notes (R3); Cloudflare `CallTransportProvider` impl + recurrence (R4/R5); the `transcriptDxn` casing fix + real `summarizeCall` (R3).
- **Placeholders:** none — file ops + naming map are explicit; model details deferred to AUDIT.
- **Type consistency:** `Meeting`/`MeetingOperation`/`MeetingCapabilities.{Settings,State}`/`MeetingState`/`activeMeeting`/`MeetingArticle`/`MeetingsList` in plugin-meeting; `Call`(slim)/`CallTransport`/`CallTransportProvider`/`CallArticle`(video) in plugin-calls. `Meeting.call?: Ref<Call>` crosses the boundary (plugin-meeting → plugin-calls), one-way.
- **Risk:** Task 2's `Meeting.call` ref to the slim `Call` precedes Task 5's slim-Call creation — build gate is at Task 4/5, so order the slim-Call type (Task 5 Step 1) before relying on the ref if a subagent runs them together; otherwise stub the field and wire at Task 5.
