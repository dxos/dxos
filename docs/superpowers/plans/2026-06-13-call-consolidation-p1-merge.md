# Call Consolidation — Plan 1: Merge plugin-meeting into plugin-calls

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Absorb the entire `plugin-meeting` package into `plugin-calls`, renaming the persistent `Meeting` type to `Call`, and delete `plugin-meeting` — with no behavioral change and a green build/lint/test.

**Architecture:** `plugin-meeting` is a thin persistence + UI layer that already depends on `plugin-calls`. We move its source (types, operations, capabilities, containers, summarize, translations) into `plugin-calls`, rename the `Meeting`→`Call` symbols, merge its `MeetingCapabilities` into the existing `CallsCapabilities`, append its plugin modules to the `CallsPlugin` `.pipe()` chain, update the one external consumer (`composer-app`) and the repo tsconfig/path/release config, then delete the package. This is a mechanical move-and-rename refactor; correctness is proven by the ported plugin test plus a full build/lint.

**Dependency-cycle break (Task 0, prerequisite):** the merge makes `plugin-calls` depend on `plugin-transcription` (meeting's transcription glue). But `plugin-transcription` already depends on `plugin-calls` for one thing only — `SpeakingMonitor` (a voice-activity detector), used in a single story. To avoid a `calls ↔ transcription` cycle we first extract the shared audio/video primitives into a new neutral leaf package **`@dxos/av`** at `packages/common/av` (runtime only, no ECHO types — hence `common`, not `sdk`). It owns the canonical `SpeakingMonitor` and `monitorAudioLevel` (the latter is currently DUPLICATED in both `plugin-calls/src/calls/util/audio.ts` and `plugin-transcription/src/util/monitor-audio-level.ts` — `@dxos/av` de-dupes them). After Task 0: `transcription → calls` is gone, both depend on `@dxos/av`, and `calls → transcription` (Task 1+) is one-way and cycle-free.

**Tech Stack:** TypeScript, Effect, `@dxos/app-framework` / `@dxos/app-toolkit` plugin system, ECHO schema, moon build, vitest.

---

## Naming Map (apply consistently everywhere)

| Old (plugin-meeting) | New (plugin-calls) |
|---|---|
| package `@dxos/plugin-meeting` | (deleted; merged into `@dxos/plugin-calls`) |
| `Meeting` namespace / `Meeting.Meeting` type | `Call` namespace / `Call.Call` type |
| DXN `org.dxos.type.meeting` | DXN `org.dxos.type.call` (no back-compat) |
| `types/Meeting.ts` | `types/Call.ts` |
| `MeetingOperation` (`types/MeetingOperation.ts`) | `CallOperation` (`types/CallOperation.ts`) |
| `MeetingOperationHandlerSet` | `CallOperationHandlerSet` |
| `MeetingCapabilities.Settings` | `CallsCapabilities.Settings` |
| `MeetingCapabilities.State` | `CallsCapabilities.RecordState` |
| `MeetingState` (type) | `CallRecordState` (type) |
| `MeetingStateStore` (type) | `CallRecordStore` (type) |
| `MeetingState.activeMeeting` field | `CallRecordState.activeCall` field |
| container `MeetingArticle` | container `CallArticle` |
| container `MeetingsList` | container `CallsList` |
| `getMeetingContent()` (summarize.ts) | `getCallContent()` |
| `MeetingSettings`, `MeetingState` capability lazies | `CallSettings`, `CallRecordState` capability lazies |
| translation namespace key (Meeting typename DXN) | Call typename DXN |

> **Why `RecordState`/`CallRecordState`, not `CallState`:** `plugin-calls` already defines a live `CallState` type in `src/calls/types.ts` (the in-call aggregate: joined/users/tracks). The meeting store (`{ activeMeeting?, transcriptionManager? }`) is a *different* concept. Renaming it to `CallState` would collide. Use `RecordState` / `CallRecordState` / `CallRecordStore`.

> **No collision for `CallArticle`:** there is no existing `CallArticle.tsx` in plugin-calls. The live in-call UI is `components/Call/Call.tsx` surfaced via `CallSidebar`; the article surface of a persistent `Call` object is the record view (notes/summary). These are distinct.

---

## File Structure (after merge)

Added to `packages/plugins/plugin-calls/src/`:

```
types/
  Call.ts                 # was Meeting.ts (Meeting -> Call, DXN org.dxos.type.call)
  CallOperation.ts        # was MeetingOperation.ts (Create/SetActive/HandlePayload/Summarize)
  Settings.ts             # was meeting Settings.ts
  CallsCapabilities.ts    # EXISTING — add Settings + RecordState (+ CallRecordState/CallRecordStore types)
  index.ts                # EXISTING — add `export * as Call from './Call'` + CallOperation
operations/               # NEW dir
  index.ts                # CallOperationHandlerSet
  create.ts
  set-active.ts
  handle-payload.ts
  summarize.ts
capabilities/
  index.ts                # EXISTING — add OperationHandler, CallExtension, CallSettings, CallRecordState
  operation-handler.ts    # moved
  call-extension.ts       # moved
  settings.ts             # moved (meeting settings)
  state.ts                # moved (record state store)
  app-graph-builder.ts    # EXISTING — MERGE meeting's 4 extensions into the contributed array
  react-surface.tsx       # EXISTING — ADD the Call article + companion surfaces
containers/
  index.ts                # EXISTING — add CallArticle, CallsList lazy exports
  CallArticle/            # was MeetingArticle/
  CallsList/              # was MeetingsList/
summarize.ts              # moved (getCallContent + summarizeTranscript + SUMMARIZE_PROMPT)
translations.ts           # EXISTING — merge meeting strings
```

Deleted entirely: `packages/plugins/plugin-meeting/`.

---

### Task 0: Extract `@dxos/av` to break the calls↔transcription cycle

**Files:**
- Create: `packages/common/av/` (package.json, moon.yml, tsconfig.json, vitest.config.ts, LICENSE, README.md, `src/index.ts`, `src/SpeakingMonitor.ts`, `src/monitor-audio-level.ts`)
- Modify: `packages/plugins/plugin-calls/src/calls/media-manager.ts`, `packages/plugins/plugin-calls/src/calls/speaking-monitor.ts` (delete), `packages/plugins/plugin-calls/src/calls/util/audio.ts` (remove `monitorAudioLevel`), `packages/plugins/plugin-calls/src/calls/util/index.ts`, `packages/plugins/plugin-calls/src/calls/index.ts`
- Modify: `packages/plugins/plugin-transcription/src/util/monitor-audio-level.ts` (delete), `packages/plugins/plugin-transcription/src/util/index.ts`, `packages/plugins/plugin-transcription/src/stories/common.ts`, and any other transcription consumers of its local `monitorAudioLevel`
- Modify: `packages/plugins/plugin-calls/package.json`, `packages/plugins/plugin-transcription/package.json`
- Modify: root `tsconfig.paths.json`, `tsconfig.all.json`, `release-please-config.json`

> **Why:** breaks the dependency cycle (see Architecture note) and de-dupes `monitorAudioLevel`.

- [ ] **Step 1: Scaffold the package**

Use `packages/common/display-name` as the structural template (same `package.json` skeleton, `moon.yml`, `tsconfig.json`, `vitest.config.ts`). Create `packages/common/av/package.json`:
```json
{
  "name": "@dxos/av",
  "version": "0.8.3",
  "description": "Audio/video runtime primitives (voice-activity detection, audio level monitoring).",
  "homepage": "https://dxos.org",
  "bugs": "https://github.com/dxos/dxos/issues",
  "repository": { "type": "git", "url": "https://github.com/dxos/dxos" },
  "license": "FSL-1.1-Apache-2.0",
  "author": "DXOS.org",
  "private": true,
  "sideEffects": false,
  "type": "module",
  "exports": {
    ".": {
      "source": "./src/index.ts",
      "types": "./dist/types/src/index.d.ts",
      "browser": "./dist/lib/browser/index.mjs",
      "node": "./dist/lib/node-esm/index.mjs"
    }
  },
  "types": "dist/types/src/index.d.ts",
  "files": ["dist", "src"],
  "dependencies": {
    "@dxos/async": "workspace:*",
    "@dxos/context": "workspace:*"
  },
  "publishConfig": { "access": "public" }
}
```
> `"private": true` is REQUIRED for new packages (per CLAUDE.md). Copy `moon.yml` from `display-name` and set the compile `--entryPoint=src/index.ts`. Copy `tsconfig.json` / `vitest.config.ts` and adjust the package name. Copy `LICENSE`; write a one-line `README.md`.

- [ ] **Step 2: Move `monitorAudioLevel` (canonical copy)**

Create `packages/common/av/src/monitor-audio-level.ts` with the exact body from `packages/plugins/plugin-calls/src/calls/util/audio.ts` (the `monitorAudioLevel` export). It has no `@dxos` deps. (The transcription copy at `plugin-transcription/src/util/monitor-audio-level.ts` is identical in intent — this becomes the single source.)

- [ ] **Step 3: Move `SpeakingMonitor`**

Create `packages/common/av/src/SpeakingMonitor.ts` with the body from `packages/plugins/plugin-calls/src/calls/speaking-monitor.ts`, changing its import of `monitorAudioLevel` to `from './monitor-audio-level'`. It imports `DeferredTask, Event, sleep` from `@dxos/async` and `Resource` from `@dxos/context` (both now declared deps).

- [ ] **Step 4: Barrel**

`packages/common/av/src/index.ts`:
```ts
export * from './SpeakingMonitor';
export * from './monitor-audio-level';
```

- [ ] **Step 5: Repoint plugin-calls**

- Delete `packages/plugins/plugin-calls/src/calls/speaking-monitor.ts`.
- Remove the `monitorAudioLevel` export from `packages/plugins/plugin-calls/src/calls/util/audio.ts` (and its re-export from `calls/util/index.ts`). If `audio.ts` becomes empty, delete it and drop it from the util barrel.
- In `packages/plugins/plugin-calls/src/calls/media-manager.ts`, change `import { SpeakingMonitor } from './speaking-monitor';` → `import { SpeakingMonitor } from '@dxos/av';`.
- Remove the `SpeakingMonitor` re-export (if any) from `packages/plugins/plugin-calls/src/calls/index.ts`; if external code imported `SpeakingMonitor` from `@dxos/plugin-calls`, that re-export is being removed — those consumers move to `@dxos/av` (only the transcription story, handled in Step 6).
- Add `"@dxos/av": "workspace:*"` to `plugin-calls/package.json` dependencies.

- [ ] **Step 6: Repoint plugin-transcription + drop its calls dep**

- Delete `packages/plugins/plugin-transcription/src/util/monitor-audio-level.ts`; remove its re-export from `plugin-transcription/src/util/index.ts`. Repoint every transcription consumer of the local `monitorAudioLevel` to `import { monitorAudioLevel } from '@dxos/av'`.
- In `packages/plugins/plugin-transcription/src/stories/common.ts`, change `import { SpeakingMonitor } from '@dxos/plugin-calls';` → `import { SpeakingMonitor } from '@dxos/av';`.
- Remove `"@dxos/plugin-calls": "workspace:*"` from `plugin-transcription/package.json` (verify no other `@dxos/plugin-calls` import remains: `grep -rn "@dxos/plugin-calls" packages/plugins/plugin-transcription/src`).
- Add `"@dxos/av": "workspace:*"` to `plugin-transcription/package.json` dependencies.

- [ ] **Step 7: Register the package in repo config**

Add `@dxos/av` path mappings to root `tsconfig.paths.json` (`"@dxos/av": ["packages/common/av/src"]` following the existing convention), add the package to `tsconfig.all.json` references, and add it to `release-please-config.json` (mirror a sibling `packages/common/*` entry).

- [ ] **Step 8: Install + build + test**

```bash
cd /Users/burdon/Code/dxos/dxos/.claude/worktrees/elated-vaughan-a5f04c
CI=true pnpm install
moon run av:build
moon run plugin-calls:build
moon run plugin-transcription:build
```
Expected: all PASS. `grep -rn "@dxos/plugin-calls" packages/plugins/plugin-transcription` returns nothing.

- [ ] **Step 9: Commit**

```bash
git add packages/common/av packages/plugins/plugin-calls packages/plugins/plugin-transcription tsconfig.paths.json tsconfig.all.json release-please-config.json pnpm-lock.yaml
git commit -m "refactor(av): extract @dxos/av (SpeakingMonitor, monitorAudioLevel); break calls↔transcription cycle"
```

---

### Task 1: Add plugin-meeting's workspace + external deps to plugin-calls

**Files:**
- Modify: `packages/plugins/plugin-calls/package.json`

`plugin-meeting` pulls in deps `plugin-calls` does not yet have. Add the union (keep existing). Workspace deps use `workspace:*`; external use `catalog:`.

- [ ] **Step 1: Inspect both dependency lists**

```bash
cd /Users/burdon/Code/dxos/dxos/.claude/worktrees/elated-vaughan-a5f04c
cat packages/plugins/plugin-meeting/package.json | sed -n '/"dependencies"/,/}/p'
cat packages/plugins/plugin-calls/package.json | sed -n '/"dependencies"/,/}/p'
```

- [ ] **Step 2: Add the missing deps to `plugin-calls/package.json`**

Add any of these not already present (these are the ones `plugin-meeting` uses and `plugin-calls` may lack). Workspace `@dxos/*`:
`@dxos/ai`, `@dxos/assistant`, `@dxos/compute`, `@dxos/edge-client`, `@dxos/effect`, `@dxos/invariant`, `@dxos/keys`, `@dxos/log`, `@dxos/plugin-client`, `@dxos/plugin-graph`, `@dxos/plugin-space`, `@dxos/plugin-transcription`, `@dxos/protocols`, `@dxos/react-client`, `@dxos/react-ui`, `@dxos/react-ui-attention`, `@dxos/react-ui-form`, `@dxos/react-ui-list`, `@dxos/react-ui-stack`, `@dxos/react-ui-theme`, `@dxos/schema`, `@dxos/types`, `@dxos/util` → value `"workspace:*"`.
External: `@effect/ai`, `@effect/experimental` → value `"catalog:"` (only if not present; `@effect-atom/atom-react` already present).

Use the catalog command for any *new external* package rather than hand-editing versions, e.g.:
```bash
pnpm add --filter @dxos/plugin-calls --save-catalog @effect/ai @effect/experimental
```
For `@dxos/*` workspace deps, hand-edit `package.json` to `"workspace:*"` (do NOT use the catalog for workspace packages).

- [ ] **Step 3: Verify the package resolves**

```bash
CI=true pnpm install
```
Expected: completes; the `DEPOT_TOKEN` warning is normal and ignorable.

- [ ] **Step 4: Commit**

```bash
git add packages/plugins/plugin-calls/package.json pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "chore(plugin-calls): add deps absorbed from plugin-meeting"
```

---

### Task 2: Move + rename the `Call` type (was `Meeting`)

**Files:**
- Create: `packages/plugins/plugin-calls/src/types/Call.ts` (from meeting `types/Meeting.ts`)
- Modify: `packages/plugins/plugin-calls/src/types/index.ts`

- [ ] **Step 1: Copy the file**

```bash
cd /Users/burdon/Code/dxos/dxos/.claude/worktrees/elated-vaughan-a5f04c
cp packages/plugins/plugin-meeting/src/types/Meeting.ts packages/plugins/plugin-calls/src/types/Call.ts
```

- [ ] **Step 2: Rename symbols + DXN inside `Call.ts`**

In `packages/plugins/plugin-calls/src/types/Call.ts`:
- Replace the exported `export const Meeting = Schema.Struct({...})` with `export const Call = Schema.Struct({...})` (rename the const only; keep all fields exactly).
- Replace the type alias `export type Meeting = ...` with `export type Call = Type.InstanceType<typeof Call>;`
- Change the DXN in `Type.makeObject(DXN.make('org.dxos.type.meeting', '0.1.0'))` to `Type.makeObject(DXN.make('org.dxos.type.call', '0.1.0'))`.
- Keep `LabelAnnotation.set(['name'])` and the `IconAnnotation` as-is.
- Add a `make()` factory matching the shape used in `create.ts` (so call sites can use `Call.make(...)`):

```ts
export const make = (props: {
  name?: string;
  transcript: Ref.Ref<Transcript.Transcript>;
  notes?: Ref.Ref<Text.Text>;
  summary?: Ref.Ref<Text.Text>;
}) =>
  Obj.make(Call, {
    name: props.name,
    created: new Date().toISOString(),
    participants: [],
    transcript: props.transcript,
    notes: props.notes ?? Ref.make(Text.make()),
    summary: props.summary ?? Ref.make(Text.make()),
  });
```
Ensure imports include `Obj`, `Ref` from `@dxos/echo`, `Text` from `@dxos/schema`, `Transcript` from `@dxos/types`.

- [ ] **Step 3: Export the namespace from `types/index.ts`**

In `packages/plugins/plugin-calls/src/types/index.ts`, add (after the existing `CallsCapabilities` export):
```ts
export * as Call from './Call';
```

- [ ] **Step 4: Type-check the type module**

```bash
moon run plugin-calls:build
```
Expected: PASS (other moved files not added yet, so this builds the type in isolation only if no other file references the not-yet-moved code; if build pulls everything, defer this check to Task 9). If it fails only due to not-yet-moved operations/capabilities, that is expected — proceed.

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-calls/src/types/Call.ts packages/plugins/plugin-calls/src/types/index.ts
git commit -m "feat(plugin-calls): add Call type (renamed from Meeting)"
```

---

### Task 3: Merge `MeetingCapabilities` into `CallsCapabilities`

**Files:**
- Modify: `packages/plugins/plugin-calls/src/types/CallsCapabilities.ts`

- [ ] **Step 1: Append the settings + record-state capability to `CallsCapabilities.ts`**

Add to the end of `packages/plugins/plugin-calls/src/types/CallsCapabilities.ts` (keep existing `Manager`, `CallProperties`, `EventHandler`):

```ts
import { type Atom } from '@effect-atom/atom-react';
import { type TranscriptionManager } from '@dxos/plugin-transcription';

import { type Call } from './Call';
import { type Settings as SettingsType } from './Settings';

export const Settings = Capability.make<Atom.Writable<SettingsType.Settings>>(`${meta.id}.capability.settings`);

export type CallRecordState = {
  activeCall?: Call.Call;
  transcriptionManager?: TranscriptionManager;
};

export type CallRecordStore = {
  stateAtom: Atom.Writable<CallRecordState>;
  get state(): CallRecordState;
  updateState: (updater: (current: CallRecordState) => CallRecordState) => void;
};

export const RecordState = Capability.make<CallRecordStore>(`${meta.id}.capability.record-state`);
```

> Adjust the `import { type Call } from './Call'` to match the namespace export style used in the file (the file is `@import-as-namespace`). If TS complains about `Call.Call`, import as `import * as Call from './Call'` instead.

- [ ] **Step 2: Commit**

```bash
git add packages/plugins/plugin-calls/src/types/CallsCapabilities.ts
git commit -m "feat(plugin-calls): merge meeting Settings/State into CallsCapabilities"
```

---

### Task 4: Move `Settings` type and the `CallOperation` definitions

**Files:**
- Create: `packages/plugins/plugin-calls/src/types/Settings.ts` (from meeting)
- Create: `packages/plugins/plugin-calls/src/types/CallOperation.ts` (from meeting `MeetingOperation.ts`)
- Modify: `packages/plugins/plugin-calls/src/types/index.ts`

- [ ] **Step 1: Move Settings**

```bash
cp packages/plugins/plugin-meeting/src/types/Settings.ts packages/plugins/plugin-calls/src/types/Settings.ts
```
No symbol rename needed (it's just `Settings`).

- [ ] **Step 2: Move + rename operations definitions**

```bash
cp packages/plugins/plugin-meeting/src/types/MeetingOperation.ts packages/plugins/plugin-calls/src/types/CallOperation.ts
```
In `CallOperation.ts`: rename any references `Meeting.Meeting` → `Call.Call`, update the import to `import { Call } from './Call'` (or `* as Call`), and keep operation member names (`Create`, `SetActive`, `HandlePayload`, `Summarize`). Update each operation's `meta.key` string if it embeds `meeting` (e.g. `org.dxos.plugin.meeting.operation.create` → `org.dxos.plugin.calls.operation.create`).

- [ ] **Step 3: Export from `types/index.ts`**

Add:
```ts
export * as CallOperation from './CallOperation';
export * as Settings from './Settings';
```
(Match the existing namespace-export convention.)

- [ ] **Step 4: Commit**

```bash
git add packages/plugins/plugin-calls/src/types/Settings.ts packages/plugins/plugin-calls/src/types/CallOperation.ts packages/plugins/plugin-calls/src/types/index.ts
git commit -m "feat(plugin-calls): add CallOperation + Settings types (from meeting)"
```

---

### Task 5: Move the operation handlers

**Files:**
- Create: `packages/plugins/plugin-calls/src/operations/{index,create,set-active,handle-payload,summarize}.ts`

- [ ] **Step 1: Copy the directory**

```bash
cp -r packages/plugins/plugin-meeting/src/operations packages/plugins/plugin-calls/src/operations
```

- [ ] **Step 2: Rename references in every operations file**

In all of `packages/plugins/plugin-calls/src/operations/*.ts`, apply the Naming Map:
- `MeetingOperation` → `CallOperation`
- `Meeting.Meeting` → `Call.Call`; `Obj.make(Meeting.Meeting, ...)` → `Call.make(...)` in `create.ts`
- `MeetingCapabilities.State` → `CallsCapabilities.RecordState`; `.activeMeeting` → `.activeCall`
- `MeetingCapabilities.Settings` → `CallsCapabilities.Settings`
- `MeetingOperationHandlerSet` → `CallOperationHandlerSet` (in `index.ts`)
- Update imports: `#types` still resolves; change `@dxos/plugin-calls` imports (meeting imported `CallsCapabilities` from `@dxos/plugin-calls/types`) to the local `#types` barrel.
- `summarize.ts`: keep the stub `Effect.fail(new Error('Not implemented'))` for now — P3 wires the real `summarizeCall`. (Do not implement here.)

- [ ] **Step 3: Verify `operations/index.ts` exports `CallOperationHandlerSet`**

```ts
export const CallOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./create'),
  () => import('./handle-payload'),
  () => import('./set-active'),
  () => import('./summarize'),
);
```

- [ ] **Step 4: Add `#operations` import alias + moon entrypoint**

In `packages/plugins/plugin-calls/package.json` `imports`, add:
```json
"#operations": "./src/operations/index.ts"
```
In `packages/plugins/plugin-calls/moon.yml` `compile.args`, add:
```yaml
- '--entryPoint=src/operations/index.ts'
```

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-calls/src/operations packages/plugins/plugin-calls/package.json packages/plugins/plugin-calls/moon.yml
git commit -m "feat(plugin-calls): add Call operation handlers (from meeting)"
```

---

### Task 6: Move capability modules (operation-handler, call-extension, settings, state)

**Files:**
- Create: `packages/plugins/plugin-calls/src/capabilities/{operation-handler,call-extension,settings,state}.ts`
- Modify: `packages/plugins/plugin-calls/src/capabilities/index.ts`

- [ ] **Step 1: Copy the four modules**

```bash
for f in operation-handler call-extension settings state; do
  cp packages/plugins/plugin-meeting/src/capabilities/$f.ts packages/plugins/plugin-calls/src/capabilities/$f.ts
done
```

- [ ] **Step 2: Rename references**

In each moved file apply the Naming Map. Specifically:
- `operation-handler.ts`: `MeetingOperationHandlerSet` → `CallOperationHandlerSet` (import from `#operations`).
- `state.ts`: `MeetingCapabilities.State` → `CallsCapabilities.RecordState`; type `MeetingState`/`MeetingStateStore` → `CallRecordState`/`CallRecordStore`; field `activeMeeting` → `activeCall`. Capability contributed = `CallsCapabilities.RecordState`.
- `settings.ts`: `MeetingCapabilities.Settings` → `CallsCapabilities.Settings`.
- `call-extension.ts`: imports of `CallsCapabilities`/`TranscriptionCapabilities` now come from `#types` (for CallsCapabilities) and `@dxos/plugin-transcription` (unchanged). `state.activeMeeting` → `state.activeCall`. Operation invocations `MeetingOperation.*` → `CallOperation.*` (from `#types`).

- [ ] **Step 3: Add the lazy capability exports to `capabilities/index.ts`**

Append:
```ts
export const OperationHandler = Capability.lazy('OperationHandler', () => import('./operation-handler'));
export const CallExtension = Capability.lazy('CallExtension', () => import('./call-extension'));
export const CallSettings = Capability.lazy('CallSettings', () => import('./settings'));
export const CallRecordState = Capability.lazy('CallRecordState', () => import('./state'));
```

- [ ] **Step 4: Commit**

```bash
git add packages/plugins/plugin-calls/src/capabilities
git commit -m "feat(plugin-calls): add operation-handler/call-extension/settings/state capabilities"
```

---

### Task 7: Merge app-graph extensions + Call surfaces

**Files:**
- Modify: `packages/plugins/plugin-calls/src/capabilities/app-graph-builder.ts`
- Modify: `packages/plugins/plugin-calls/src/capabilities/react-surface.tsx`

- [ ] **Step 1: Read both source builders**

```bash
sed -n '1,260p' packages/plugins/plugin-meeting/src/capabilities/app-graph-builder.ts
sed -n '1,120p' packages/plugins/plugin-calls/src/capabilities/app-graph-builder.ts
```

- [ ] **Step 2: Merge the meeting graph extensions into plugin-calls's builder**

Port these four extensions from meeting into the contributed array of `plugin-calls/src/capabilities/app-graph-builder.ts` (applying the Naming Map — `MeetingOperation`→`CallOperation`, `Meeting.Meeting`→`Call.Call`, `activeMeeting`→`activeCall`, `RecordState`):
1. `shareCallLink` (Channel) — "Share call link" action.
2. `callCompanion` (Channel) — companion → `CallsList` or `CallArticle`.
3. `callTranscript` (Channel) — start/stop transcription action + transcript companion.
4. `meetingTranscriptCompanion` (Meeting→**Call**) — transcript companion for a `Call` node.

Keep plugin-calls's existing `activeCall` / `channelChatCompanion` extensions. If the file uses a single `Capability.contributes(AppCapabilities.AppGraphBuilder, [ ...extensions ])`, extend that array; if it returns multiple, add to the list.

- [ ] **Step 3: Add the Call article + companion surfaces to `react-surface.tsx`**

Port meeting's two surfaces (`meeting` article, `meetingCompanion`) into `plugin-calls/src/capabilities/react-surface.tsx`, renaming ids/components: filter on `AppSurface.object(AppSurface.Article, Call.Call)` → render `<CallArticle .../>`; companion → `<CallsList/>`/`<CallArticle/>`. Keep existing `activeCallCompanion` + `devtoolsOverview`.

- [ ] **Step 4: Build (expect failures only from not-yet-moved containers)**

```bash
moon run plugin-calls:build
```
Expected: errors referencing `CallArticle`/`CallsList` (moved in Task 8). Other errors are real — fix before continuing.

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-calls/src/capabilities/app-graph-builder.ts packages/plugins/plugin-calls/src/capabilities/react-surface.tsx
git commit -m "feat(plugin-calls): merge meeting app-graph extensions + Call surfaces"
```

---

### Task 8: Move containers + summarize + translations

**Files:**
- Create: `packages/plugins/plugin-calls/src/containers/CallArticle/*`, `CallsList/*`
- Modify: `packages/plugins/plugin-calls/src/containers/index.ts`
- Create: `packages/plugins/plugin-calls/src/summarize.ts`
- Modify: `packages/plugins/plugin-calls/src/translations.ts`

- [ ] **Step 1: Move containers (drop the .stories.tsx for now; re-add in a later UI pass)**

```bash
cp -r packages/plugins/plugin-meeting/src/containers/MeetingArticle packages/plugins/plugin-calls/src/containers/CallArticle
cp -r packages/plugins/plugin-meeting/src/containers/MeetingsList packages/plugins/plugin-calls/src/containers/CallsList
mv packages/plugins/plugin-calls/src/containers/CallArticle/MeetingArticle.tsx packages/plugins/plugin-calls/src/containers/CallArticle/CallArticle.tsx
rm -f packages/plugins/plugin-calls/src/containers/CallArticle/MeetingArticle.stories.tsx
mv packages/plugins/plugin-calls/src/containers/CallsList/MeetingsList.tsx packages/plugins/plugin-calls/src/containers/CallsList/CallsList.tsx
```

- [ ] **Step 2: Rename inside the container files**

`CallArticle.tsx`: `MeetingArticle`→`CallArticle`, `MeetingArticleProps`→`CallArticleProps`, `Meeting.Meeting`→`Call.Call`, `meeting`→`call` locals where it reads naturally, `MeetingOperation`→`CallOperation`, `MeetingCapabilities.*`→`CallsCapabilities.*`. Update each subdir `index.ts` to bridge `export { CallArticle as default }` / named.
`CallsList.tsx`: `MeetingsList`→`CallsList`, same Naming Map.

- [ ] **Step 3: Update `containers/index.ts`**

Append:
```ts
export const CallArticle: ComponentType<any> = lazy(() => import('./CallArticle'));
export const CallsList: ComponentType<any> = lazy(() => import('./CallsList'));
```

- [ ] **Step 4: Move summarize + merge translations**

```bash
cp packages/plugins/plugin-meeting/src/summarize.ts packages/plugins/plugin-calls/src/summarize.ts
```
In `summarize.ts`: `getMeetingContent`→`getCallContent`, `Meeting.Meeting`→`Call.Call`. Keep `summarizeTranscript` + `SUMMARIZE_PROMPT`.
Open `packages/plugins/plugin-meeting/src/translations.ts` and merge its entries into `packages/plugins/plugin-calls/src/translations.ts`: re-key the Meeting typename block to the `Call.Call` typename, and merge the `meta.id`-scoped strings (start-transcription, meeting-list→call-list, create-meeting→create-call, notes, summary, …) under the calls `meta.id`.

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-calls/src/containers packages/plugins/plugin-calls/src/summarize.ts packages/plugins/plugin-calls/src/translations.ts
git commit -m "feat(plugin-calls): add CallArticle/CallsList + summarize + translations (from meeting)"
```

---

### Task 9: Wire the new modules into `CallsPlugin` and build

**Files:**
- Modify: `packages/plugins/plugin-calls/src/CallsPlugin.tsx`

- [ ] **Step 1: Extend the `.pipe()` chain**

Edit `packages/plugins/plugin-calls/src/CallsPlugin.tsx` to add the meeting modules. Final form:

```tsx
import { ActivationEvent, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { ClientEvents } from '@dxos/plugin-client';

import {
  AppGraphBuilder,
  CallExtension,
  CallManager,
  CallRecordState,
  CallSettings,
  OperationHandler,
  ReactRoot,
  ReactSurface,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Call, CallsCapabilities } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

const StateReady = AppActivationEvents.createStateEvent(meta.id);
const SettingsReady = AppActivationEvents.createSettingsEvent(CallsCapabilities.Settings.identifier);

export const CallsPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [Call.Call] }),
  AppPlugin.addReactRootModule({ activate: ReactRoot }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'call-manager',
    activatesOn: ClientEvents.ClientReady,
    activate: CallManager,
  }),
  Plugin.addModule({
    activatesOn: AppActivationEvents.SetupSettings,
    firesAfterActivation: [SettingsReady],
    activate: CallSettings,
  }),
  Plugin.addModule({
    activatesOn: ActivationEvent.oneOf(AppActivationEvents.SetupSettings, AppActivationEvents.SetupAppGraph),
    firesAfterActivation: [StateReady],
    activate: CallRecordState,
  }),
  Plugin.addModule({
    activatesOn: ActivationEvent.allOf(SettingsReady, StateReady),
    activate: CallExtension,
  }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.id, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default CallsPlugin;
```

- [ ] **Step 2: Build plugin-calls clean**

```bash
moon run plugin-calls:build
```
Expected: PASS. Fix any remaining `Meeting*`/`activeMeeting`/`MeetingOperation` references the Naming Map missed.

- [ ] **Step 3: Lint**

```bash
moon run plugin-calls:lint -- --fix
```

- [ ] **Step 4: Commit**

```bash
git add packages/plugins/plugin-calls/src/CallsPlugin.tsx
git commit -m "feat(plugin-calls): wire merged meeting modules into CallsPlugin"
```

---

### Task 10: Port the plugin test

**Files:**
- Create: `packages/plugins/plugin-calls/src/CallsPlugin.test.ts` (from meeting `MeetingPlugin.test.ts`)

- [ ] **Step 1: Copy + rename the test**

```bash
cp packages/plugins/plugin-meeting/src/MeetingPlugin.test.ts packages/plugins/plugin-calls/src/CallsPlugin.test.ts
```
Apply the Naming Map throughout (imports from `#plugin`/`#types`, `MeetingPlugin`→`CallsPlugin`, `Meeting.Meeting`→`Call.Call`, `MeetingOperation`→`CallOperation`). If the existing `plugin-calls` already has a plugin test, MERGE the meeting assertions into it instead of adding a second file (per the testing guideline: prefer extending existing suites).

- [ ] **Step 2: Run it (expect fail first if any symbol mismatch)**

```bash
moon run plugin-calls:test -- src/CallsPlugin.test.ts
```
Expected: PASS once symbols line up. If FAIL, read the error and fix the rename.

- [ ] **Step 3: Run the whole package test suite**

```bash
moon run plugin-calls:test
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/plugins/plugin-calls/src/CallsPlugin.test.ts
git commit -m "test(plugin-calls): port meeting plugin test"
```

---

### Task 11: Repoint the one external consumer (composer-app) and root config

**Files:**
- Modify: `packages/apps/composer-app/src/plugin-defs.tsx`
- Modify: `packages/apps/composer-app/package.json`
- Modify: `packages/apps/composer-app/tsconfig.json`
- Modify: `tsconfig.paths.json`, `tsconfig.all.json`, `release-please-config.json`

- [ ] **Step 1: Remove MeetingPlugin from composer-app**

In `packages/apps/composer-app/src/plugin-defs.tsx`:
- Delete the import `import { MeetingPlugin } from '@dxos/plugin-meeting/plugin';` (line ~49).
- Delete the `MeetingPlugin.meta.id` entry from the labs defaults list (line ~148).
- Delete `MeetingPlugin(),` from the `getPlugins()` array (line ~223).

`CallsPlugin` already covers the merged behavior (it is already registered, line ~186).

- [ ] **Step 2: Drop the workspace dep + tsconfig refs**

```bash
cd /Users/burdon/Code/dxos/dxos/.claude/worktrees/elated-vaughan-a5f04c
```
- Remove `"@dxos/plugin-meeting": "workspace:*"` from `packages/apps/composer-app/package.json`.
- Remove the `@dxos/plugin-meeting` path mapping from `packages/apps/composer-app/tsconfig.json` (references array) and from root `tsconfig.paths.json` (both `@dxos/plugin-meeting` and `@dxos/plugin-meeting/*`).
- Remove the `packages/plugins/plugin-meeting` entry from `tsconfig.all.json` references and from `release-please-config.json`.

- [ ] **Step 3: Grep for any other stragglers**

```bash
grep -rn "@dxos/plugin-meeting" --include='*.ts' --include='*.tsx' --include='*.json' . | grep -v node_modules
```
Expected: no results. Fix any that remain (apply Naming Map; import from `@dxos/plugin-calls` instead).

- [ ] **Step 4: Commit**

```bash
git add packages/apps/composer-app tsconfig.paths.json tsconfig.all.json release-please-config.json
git commit -m "refactor(composer-app): drop plugin-meeting; CallsPlugin now owns Call"
```

---

### Task 12: Delete plugin-meeting

**Files:**
- Delete: `packages/plugins/plugin-meeting/`

- [ ] **Step 1: Remove the package**

```bash
git rm -r packages/plugins/plugin-meeting
```

- [ ] **Step 2: Reinstall + global build**

```bash
CI=true pnpm install
moon run plugin-calls:build
moon run composer-app:build
```
Expected: both PASS.

- [ ] **Step 3: Repo-wide grep sanity**

```bash
grep -rn "plugin-meeting\|MeetingPlugin\|MeetingOperation\|MeetingCapabilities" --include='*.ts' --include='*.tsx' --include='*.json' . | grep -v node_modules
```
Expected: no results.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: delete plugin-meeting (absorbed into plugin-calls)"
```

---

### Task 13: Update the spec + final verification

**Files:**
- Modify: `packages/plugins/plugin-calls/PLUGIN.mdl` (already specifies Call; just confirm F-9.5 satisfied)

- [ ] **Step 1: Full lint + test + fmt for the touched packages**

```bash
moon run plugin-calls:lint -- --fix
moon run plugin-calls:test
moon run composer-app:build
pnpm format
```
Expected: all green.

- [ ] **Step 2: Cast audit (per CLAUDE.md)**

```bash
git diff origin/main | grep -nE '\bas (any|unknown|[A-Z])|as unknown as' || echo "no new casts"
```
Expected: `no new casts` (or each justified at a real boundary).

- [ ] **Step 3: Confirm spec coverage**

Re-read `plugin-calls/PLUGIN.mdl` F-9.1 and F-9.5: `Meeting` gone, no `plugin-meeting`, no compat re-exports. Verified by the Task 12 grep.

- [ ] **Step 4: Commit any formatting**

```bash
git add -A
git commit -m "chore(plugin-calls): format + lint after meeting merge"
```

---

## Self-Review

**Spec coverage (against `plugin-calls/PLUGIN.mdl`):**
- F-9.1 (Call type replaces Meeting) → Tasks 2, 12. ✓
- F-9.3 (Call article: notes + summary) → Task 8 (CallArticle). ✓
- F-9.5 (no Meeting/plugin-meeting/compat re-exports) → Tasks 11, 12 + greps. ✓
- F-9.2/F-9.4 (createCall/summarizeCall behavior) → **out of scope for P1** (createCall arrives with Event linkage in P2/P3; summarizeCall stays a stub here). Noted in Task 5 Step 2.
- F-10 (pluggable transport) → **P4**. F-11 (Event linkage + recurrence) → **P2/P3/P5**.

**Placeholder scan:** none — every step has exact paths/commands. Symbol renames are enumerated in the Naming Map rather than left vague.

**Type consistency:** `Call`/`Call.Call`, `CallOperation`, `CallsCapabilities.{Settings,RecordState}`, `CallRecordState`/`CallRecordStore`, `activeCall`, `CallArticle`/`CallsList`, `CallOperationHandlerSet`, `getCallContent` used consistently across Tasks 2–10. `RecordState` deliberately distinct from the live `CallState` in `src/calls/types.ts`.

**Risks called out inline:** app-graph-builder merge (Task 7) and translations merge (Task 8) are the two non-mechanical steps — they require reading the existing plugin-calls files and merging arrays/objects rather than blind copy. Build gates after each catch mistakes.
