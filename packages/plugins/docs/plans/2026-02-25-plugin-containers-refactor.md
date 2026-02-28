# Plugin Containers Refactor — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor all remaining DXOS plugins so that surface components (those referenced by `react-surface.tsx`) live in `src/containers/` with lazy exports, while primitive components stay in `src/components/`.

**Architecture:** Each plugin follows a strict two-directory pattern: `src/components/` holds stateless primitives with no `@dxos/app-framework` hooks; `src/containers/` holds surface components (lazy-loaded, with `SurfaceComponentProps` type, with `<Suspense>` boundaries where needed). The `src/capabilities/react-surface/react-surface.tsx` file imports only from `../../containers`. The exemplar is `plugin-kanban`.

**Tech Stack:** TypeScript, React (lazy/Suspense), moon build system, pnpm, esbuild, ESLint/Prettier.

---

## Context & Rules

### Directory Pattern
```
src/
  components/          # Primitive, stateless, no @dxos/app-framework hooks
    ComponentName/
      ComponentName.tsx
      ComponentName.stories.tsx
      index.ts         # export * from './ComponentName'
    index.ts           # barrel: export * from './ComponentName'
  containers/          # Surface components — lazy exports
    ContainerName/
      ContainerName.tsx
      ContainerName.stories.tsx
      index.ts         # bridge: import { X } from './X'; export default X;
    index.ts           # lazy barrel: export const X: ComponentType<any> = lazy(() => import('./X'))
```

### Key Rules
- `containers/index.ts` top-level uses `lazy(() => import('./X'))` — no `.then()` needed
- Add `: ComponentType<any>` to each lazy export to avoid TS2742
- Container `index.ts` bridges named → default: `import { X } from './X'; export default X;`
- `react-surface.tsx` imports only from `../../containers` (never from `../../components`)
- If a surface component defines a prop type used elsewhere, re-export it from `containers/index.ts` as `export type { XProps } from './X/X'`
- If a surface needs a string constant (dialog ID), extract to `src/constants.ts`
- Container-to-container imports use default import: `import X from '../X';`
- Surface components should use `SurfaceComponentProps` from `@dxos/app-toolkit/ui`
- `<Suspense>` boundaries: The `Surface` component in app-framework wraps lazy containers in Suspense. Containers that render sub-lazy components or async operations should add their own `<Suspense fallback={null}>` internally.
- NEVER delete subdirectories that contain primitives used by containers — only delete the surface component files within them, then update the subdir's `index.ts`

### Per-Plugin Workflow (STRICTLY FOLLOW)
1. Investigate: `ls containers/`, `ls components/`, read `react-surface.tsx`
2. Fix any broken imports
3. Build: `moon run plugin-X:build`
4. Fix build errors
5. Lint: `moon run plugin-X:lint`
6. Fix lint errors
7. Update `AGENTS.md`: add `## plugin-X` section + mark `[x]` in plugin list
8. Commit: `git add ... && git commit -m "refactor(plugin-X): move surface components to containers/"`
9. Push: `git push`

### Build Commands
```bash
moon run plugin-name:build     # build
moon run plugin-name:lint      # lint
moon run plugin-name:compile   # tsc only (faster for finding TS errors)
```

### Finding Errors
```bash
moon run plugin-X:compile 2>&1 | grep -v "cached\|▮\|Tasks\|Time\|moon\|warnings\|Getter" | head -30
moon run plugin-X:build 2>&1 | grep -v "cached\|▮\|Tasks\|Time\|moon\|warnings\|Getter" | head -30
```

---

## Current State (as of 2026-02-25)

### Already Complete (committed + pushed)
- plugin-assistant, plugin-automation, plugin-board, plugin-chess
- plugin-client, plugin-debug, plugin-deck
- plugin-excalidraw ✓ (committed, but checkbox in AGENTS.md not yet marked [x])
- plugin-explorer ✓ (committed, but checkbox not marked)
- plugin-files ✓ (committed, but checkbox not marked)
- plugin-help, plugin-inbox, plugin-kanban, plugin-map, plugin-markdown

### Fix AGENTS.md Checkboxes First
Three plugins were committed but their checkboxes were not updated:
- `plugin-excalidraw`, `plugin-explorer`, `plugin-files`

---

## Task 1: Fix AGENTS.md Checkboxes

**Files:**
- Modify: `packages/plugins/AGENTS.md`

**Step 1: Update checkboxes**

In `AGENTS.md`, change:
```markdown
- [ ] plugin-excalidraw
- [ ] plugin-explorer
- [ ] plugin-files
```
to:
```markdown
- [x] plugin-excalidraw
- [x] plugin-explorer
- [x] plugin-files
```

**Step 2: Commit and push**
```bash
git add packages/plugins/AGENTS.md
git commit -m "docs: fix AGENTS.md checkboxes for excalidraw, explorer, files"
git push
```

---

## Task 2: plugin-conductor

**Status:** `containers/CanvasContainer/` exists; react-surface imports from containers.

**Files:**
- Read: `packages/plugins/plugin-conductor/src/capabilities/react-surface/react-surface.tsx`
- Read: `packages/plugins/plugin-conductor/src/containers/index.ts`
- Read: `packages/plugins/plugin-conductor/src/components/index.ts`
- Modify: `packages/plugins/AGENTS.md`

**Step 1: Investigate**
```bash
ls packages/plugins/plugin-conductor/src/containers/
ls packages/plugins/plugin-conductor/src/components/
cat packages/plugins/plugin-conductor/src/containers/index.ts
cat packages/plugins/plugin-conductor/src/capabilities/react-surface/react-surface.tsx
```

**Step 2: Build**
```bash
moon run plugin-conductor:build 2>&1 | grep -v "cached\|▮\|Tasks\|Time\|moon\|warnings\|Getter" | head -30
```
Fix any errors.

**Step 3: Lint**
```bash
moon run plugin-conductor:lint 2>&1 | grep -v "cached\|▮\|Tasks\|Time" | head -20
```
Fix any lint errors.

**Step 4: Update AGENTS.md**
- Mark `- [x] plugin-conductor` in plugin list
- Add `## plugin-conductor` section with bullets for each container moved

**Step 5: Commit and push**
```bash
git add packages/plugins/AGENTS.md packages/plugins/plugin-conductor/src/
git commit -m "refactor(plugin-conductor): move surface components to containers/"
git push
```

---

## Task 3: plugin-masonry

**Status:** `containers/MasonryContainer/` exists.

Follow same workflow as Task 2. Key investigation commands:
```bash
ls packages/plugins/plugin-masonry/src/containers/
ls packages/plugins/plugin-masonry/src/components/
cat packages/plugins/plugin-masonry/src/containers/index.ts
```

---

## Task 4: plugin-meeting

**Status:** `containers/MeetingContainer/`, `MeetingSettings/`, `MeetingsList/` exist.

Follow same workflow. Note: `MeetingsList` is a list component — check if it should be `MeetingList` to match naming conventions.

---

## Task 5: plugin-navtree

**Status:** `containers/CommandsDialogContent/`, `CommandsTrigger/`, `NavTreeContainer/`, `NavTreeDocumentTitle/` exist.

**Known complexity:** NavTree has `NavTree/`, `NavTreeContext.tsx`, `NavTreeItem/`, `Sidebar/`, `UserAccountAvatar/` as components that may be used by containers.

Follow same workflow. Check that `react-surface.tsx` imports are all from `../../containers`.

---

## Task 6: plugin-observability

**Status:** `containers/HelpContainer/`, `ObservabilitySettings/` exist; `components/` has `FeedbackForm.tsx`.

**Step 1: Investigate**
```bash
ls packages/plugins/plugin-observability/src/containers/
ls packages/plugins/plugin-observability/src/components/
```
`FeedbackForm` is a primitive used by `HelpContainer` — it should stay in `components/`.

Follow same workflow.

---

## Task 7: plugin-outliner

**Status:** `containers/JournalContainer/`, `OutlineCard/`, `OutlineContainer/` exist.

Follow same workflow.

---

## Task 8: plugin-pipeline

**Status:** `containers/PipelineContainer/`, `PipelineObjectSettings/` exist.

Follow same workflow.

---

## Task 9: plugin-presenter

**Status:** `containers/CollectionPresenterContainer/`, `DocumentPresenterContainer/`, `MarkdownSlide/`, `PresenterSettings/` exist.

Follow same workflow. Note: `MarkdownSlide` — check if it uses `@dxos/app-framework` hooks; if not, it might be a primitive that lives in `components/` but is referenced as a surface.

---

## Task 10: plugin-registry

**Status:** `containers/PluginDetail/`, `RegistryContainer/` exist.

Follow same workflow.

---

## Task 11: plugin-script

**Status:** `containers/DeploymentDialog/`, `NotebookContainer/`, `ScriptContainer/`, `ScriptObjectSettings/`, `ScriptPluginSettings/`, `ScriptProperties/`, `TestContainer/` exist.

**Known complexity:** `components/` has primitives like `FrameContainer`, `NotebookStack`, `QueryEditor`, `ScriptToolbar`, `TypescriptEditor` that containers import.

Follow same workflow. Verify `components/index.ts` exports all needed primitives.

---

## Task 12: plugin-search

**Status:** `containers/SearchDialog/`, `SearchMain/`, `SpaceMain/` exist; `src/constants.ts` created.

Follow same workflow. Verify `SEARCH_DIALOG` constant is in `constants.ts` and `react-surface.tsx` imports it from there.

---

## Task 13: plugin-sheet

**Status:** `containers/RangeList/`, `SheetContainer/` exist.

Follow same workflow.

---

## Task 14: plugin-sketch

**Status:** `containers/SketchContainer/`, `SketchSettings/` exist.

Note: This is separate from `plugin-excalidraw` (which is the plugin wrapper). Follow same workflow.

---

## Task 15: plugin-space

**Status:** Large number of containers exist. `components/` has several restored primitive subdirs.

**Known complexity:** This plugin was over-deleted and partially restored. Key primitives in components:
- `components/AwaitingObject/`
- `components/CreateDialog/CreateObjectPanel`
- `components/ObjectCardStack/ObjectForm`
- `components/ObjectDetails/BaseObjectSettings`, `ForeignKeys`
- `components/SyncStatus/` (save-tracker, status utilities)

**Step 1: Build carefully**
```bash
moon run plugin-space:build 2>&1 | grep -v "cached\|▮\|Tasks\|Time\|moon\|warnings\|Getter" | head -30
```

Follow same workflow. The section in AGENTS.md should note the complex restoration.

---

## Task 16: plugin-stack

**Status:** `containers/StackContainer/` exists; `components/` has `StackContext`, `StackSection`, `StackSettings`.

Follow same workflow. Verify `components/index.ts` exports `StackContext` and `StackSection` (needed by `StackContainer`).

---

## Task 17: plugin-status-bar

**Status:** `containers/StatusBarActions/`, `StatusBarPanel/`, `VersionNumber/` exist.

Follow same workflow. `components/` should only keep `StatusBar` primitives.

---

## Task 18: plugin-thread

**Status:** `containers/CallDebugPanel/`, `CallSidebar/`, `ChannelContainer/`, `ChatContainer/`, `ThreadCompanion/`, `ThreadSettings/` exist.

**Known complexity:** Thread has complex components. Check if any containers import from each other.

Follow same workflow.

---

## Task 19: plugin-token-manager

**Status:** `containers/TokensContainer/` exists.

Follow same workflow.

---

## Task 20: plugin-transcription

**Status:** `containers/TranscriptionContainer/` exists; `components/` has `Transcript`.

Follow same workflow. `Transcript` is a primitive that should stay in `components/`.

---

## Task 21: plugin-wnfs

**Status:** `components/FileContainer.tsx` is referenced by `react-surface.tsx` — needs to move to `containers/`.

**Step 1: Create containers structure**
```bash
mkdir -p packages/plugins/plugin-wnfs/src/containers/FileContainer
```

**Step 2: Move FileContainer.tsx**
```bash
mv packages/plugins/plugin-wnfs/src/components/FileContainer.tsx \
   packages/plugins/plugin-wnfs/src/containers/FileContainer/FileContainer.tsx
```

**Step 3: Create container index.ts bridge**
```typescript
// packages/plugins/plugin-wnfs/src/containers/FileContainer/index.ts
import { FileContainer } from './FileContainer';
export default FileContainer;
```

**Step 4: Create top-level containers/index.ts**
```typescript
// packages/plugins/plugin-wnfs/src/containers/index.ts
import { type ComponentType, lazy } from 'react';
export const FileContainer: ComponentType<any> = lazy(() => import('./FileContainer'));
```

**Step 5: Update react-surface.tsx**
Change import from `../../components` to `../../containers` for `FileContainer`.

**Step 6: Update components/index.ts**
Remove `FileContainer` export; keep `FileInput`, `FilePreview`.

**Step 7: Build, lint, document, commit, push**
```bash
moon run plugin-wnfs:build 2>&1 | tail -5
moon run plugin-wnfs:lint 2>&1 | tail -5
git add packages/plugins/AGENTS.md packages/plugins/plugin-wnfs/src/
git commit -m "refactor(plugin-wnfs): move FileContainer to containers/"
git push
```

---

## Task 22: plugin-table

**Status:** `containers/TableCard/`, `TableContainer/` already exist with proper setup. Just needs documentation.

**Step 1: Verify build**
```bash
moon run plugin-table:build 2>&1 | tail -5
moon run plugin-table:lint 2>&1 | tail -5
```

**Step 2: Update AGENTS.md**
- Mark `- [x] plugin-table`
- Add `## plugin-table` section

**Step 3: Commit and push**
```bash
git add packages/plugins/AGENTS.md
git commit -m "docs(plugin-table): document containers refactor in AGENTS.md"
git push
```

---

## Task 23: plugin-preview

**Status:** `react-surface.tsx` imports `FormCard`, `PersonCard`, etc. from `../../cards` — not from `containers/`. These are rendered inline in `component:` callbacks (not lazy). Must audit.

**Step 1: Investigate**
```bash
cat packages/plugins/plugin-preview/src/capabilities/react-surface/react-surface.tsx
ls packages/plugins/plugin-preview/src/cards/
```

**Step 2: Decision**
If cards are small inline components rendered synchronously in the surface callbacks (not lazy), they may be acceptable as-is. Flag as ISSUE in AGENTS.md: "cards/ pattern differs from containers/ — surfaces are not lazy-loaded."

If they should be moved to `containers/`, create container dirs and lazy exports.

**Step 3: Build and lint**
```bash
moon run plugin-preview:build 2>&1 | tail -5
moon run plugin-preview:lint 2>&1 | tail -5
```

**Step 4: Document, commit, push**

---

## Task 24: Plugins with No React-Surface (Audit Only)

The following plugins have no `react-surface` capability and no containers. Verify this and mark as complete with a note:

- **plugin-attention** — check for any surface references
- **plugin-graph** — likely pure utility/data
- **plugin-mermaid** — check `react-surface.tsx`
- **plugin-native** — native platform specific
- **plugin-settings** — check for surface components
- **plugin-transformer** — check for surface components

For each:
```bash
ls packages/plugins/plugin-X/src/capabilities/
grep -r "ReactSurface\|react-surface" packages/plugins/plugin-X/src/ 2>/dev/null | head -5
```

If no react-surface: mark `[x]` in AGENTS.md with note "no react-surface capability; no containers needed."
If react-surface exists: add to earlier tasks list and follow full workflow.

---

## Task 25: Suspense Audit

**Background:** `AGENTS.md` says "Surface should implement appropriate `<Suspense>` boundaries." The `Surface` component in app-framework (`packages/sdk/app-framework/src/ui/components/surface/SurfaceComponent.tsx`) already wraps all lazy containers in `<Suspense fallback={placeholder}>`. So top-level lazy containers are covered.

**What still needs Suspense:**
1. If a container uses `React.use()` for async data, wrap in `<Suspense fallback={null}>`
2. If a container renders sub-lazy-components (imported with `lazy()`), wrap in `<Suspense fallback={null}>`

**Step 1: Scan containers for async patterns**
```bash
grep -r "React\.use\b" packages/plugins/*/src/containers/ --include="*.tsx" | head -20
grep -r "lazy(" packages/plugins/*/src/containers/*/.*\.tsx | head -20
```

**Step 2: Add Suspense where needed**

Pattern for containers that use `React.use()`:
```tsx
import { Suspense, use } from 'react';

export const MyContainer = ({ subject }: MyContainerProps) => {
  return (
    <Suspense fallback={null}>
      <MyContainerInner subject={subject} />
    </Suspense>
  );
};

const MyContainerInner = ({ subject }: MyContainerProps) => {
  const data = use(somePromise);
  // ...
};
```

**Step 3: Update Observations in AGENTS.md**
Add: "Containers that use React.use() or render sub-lazy components need their own `<Suspense>` boundaries; top-level lazy containers are already wrapped by the `Surface` component."

---

## Task 26: Final AGENTS.md Observations & Recommendations

After all plugins are complete, update the `## Observations` and `## Recommendations` sections in `AGENTS.md`:

**Observations to add:**
- Type re-exports pattern: when lazy `ComponentType<any>` hides prop types needed externally, add `export type { XProps } from './X/X'` to `containers/index.ts`
- Primitive subdirectory preservation: when a subdirectory contains both a surface component and primitives, only the surface file moves to `containers/`; the primitives stay and the subdir's `index.ts` is updated
- Constants extraction: string constants used in react-surface role IDs (e.g., dialog IDs) should be in `src/constants.ts`
- The `Surface` component in app-framework provides the top-level `<Suspense>` boundary for all lazy containers

**Recommendations to add:**
- Future refactoring: audit all containers for classNames/custom styling (currently flagged as issues but deferred)
- Future storybook: containers requiring space/db context could use mock providers
- Consider standardizing `SurfaceComponentProps` usage across all containers

**Final commit:**
```bash
git add packages/plugins/AGENTS.md
git commit -m "docs: finalize AGENTS.md observations and recommendations"
git push
```

---

## Summary

| # | Plugin | Status |
|---|--------|--------|
| 1 | Fix AGENTS.md checkboxes | excalidraw, explorer, files |
| 2-20 | 19 plugins with containers | build/lint/document/commit/push each |
| 21 | plugin-wnfs | create containers, move FileContainer |
| 22 | plugin-table | document only |
| 23 | plugin-preview | audit cards/ pattern |
| 24 | 6 no-react-surface plugins | audit and mark complete |
| 25 | Suspense audit | scan + fix where needed |
| 26 | Final AGENTS.md | observations + recommendations |

**Per-plugin time estimate:** ~5-15 min each depending on complexity.
**Total remaining:** ~20-26 tasks.
