# Ambient Review Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make multi-user suggestion review ambient (Google-Docs-style): by default the user sees main + comments + all users' suggestions overlaid, with a per-user Editing/Suggesting/Viewing mode — without actively managing branches.

**Architecture:** Additive. When no explicit version is selected (`selection.kind === 'current'`), MarkdownArticle renders an aggregated suggestion overlay (built from all active `kind:'suggestion'` branches) + comments, gated by a product-level `ReviewRenderPolicy` keyed on a new per-doc `mode`. The overlay is driven into the live editor through the existing live-reconfigured CodeMirror compartment pattern (`compareCompartment`). The explicit branch switcher / Base-Diff-Branch selector / `VersionBanner` are retained unchanged as the advanced path.

**Tech Stack:** TypeScript, React (arrow components, Tailwind), CodeMirror 6 (compartments), Effect, `@effect-atom/atom-react`, `@dxos/versioning` (branch bind/merge), `@dxos/ui-editor` review extensions, vitest + Storybook play tests.

**Spec:** [`packages/plugins/plugin-comments/DESIGN.md`](../../../packages/plugins/plugin-comments/DESIGN.md) § "Ambient review model (spec — brainstormed 2026-07-21)".

## Global Constraints

- No casts to silence the type-checker (`as any`, `as unknown as T`, non-null `!`); fix types at the source. `as const` is fine.
- Workspace deps use `workspace:*`; peer deps use `workspace:^`.
- Comments state _why_ in one load-bearing clause; JSDoc public functions.
- React: named `@dxos/react-ui` imports, arrow components, `forwardedRef` naming, theme tokens (no raw colours).
- Build/test/lint via the proto moon shim: `~/.proto/bin/moon run <pkg>:<task>` (the PATH `moon` is the wrong version). Format with `npx oxfmt --write <files>`.
- Do not remove or alter the advanced version path (branch switcher, `VersionBanner`, Base/Diff/Branch selector, checkpoint/fork views). This plan is additive.
- Reuse existing review primitives — `suggestions({ sources })`, `buildSuggestionSources`, `AcceptChange`/`RejectChange`, `Branch.suggestion`/`Branch.bind`. Do not add new diff/merge primitives.

## Scope

Two milestones. **Milestone A (this plan, fully specified):** mode state + render policy + ambient overlay for **Editing/Viewing** + inline/companion review of existing suggestions — shippable on its own (users see & review all suggestions ambiently; authoring stays on the existing explicit "Suggest edits" / advanced path). **Milestone B (spike-gated):** **Suggesting** mode authoring (typing accrues to the user's branch while their edits render as tracked changes over main). Milestone B begins with a research spike (Task B0) because composing live editing + self-diff overlay + foreign-source overlays on one buffer is not yet designed; its implementation tasks are written after the spike picks an approach.

---

## File Structure

- `packages/plugins/plugin-space/src/types/capabilities.ts` — add `ReviewMode`, `VersioningState.mode`, `ReviewRenderPolicy` type + capability + default.
- `packages/plugins/plugin-space/src/capabilities/*` — initialise `mode: {}` in the VersioningState atom; contribute the default `ReviewRenderPolicy`.
- `packages/plugins/plugin-markdown/src/hooks/useVersioning.ts` — expose `mode` / `setMode`.
- `packages/plugins/plugin-comments/src/components/Suggestions/SuggestionSources.tsx` — extract the branch-enumeration probe from `Suggestions.tsx` into a reusable headless component that reports resolved sources up (used by the companion and by the editor overlay bridge).
- `packages/plugins/plugin-comments/src/capabilities/markdown-extension.ts` + `extensions/suggestions-overlay.ts` (new) — an editor extension that renders the aggregated `suggestions({ sources })` overlay from a live-reconfigured compartment.
- `packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.tsx` — ambient-path wiring: mode toggle action, policy gating, aggregated overlay in the `current` selection.

---

## Milestone A — ambient overlay (Editing / Viewing) + review

### Task A1: Per-document review mode state

**Files:**

- Modify: `packages/plugins/plugin-space/src/types/capabilities.ts` (VersioningState namespace, ~line 55-78)
- Modify: `packages/plugins/plugin-space/src/capabilities/` (the module that creates the `VersioningState` atom with its initial value — grep `VersioningState` + `Atom.make`)
- Modify + Test: `packages/plugins/plugin-markdown/src/hooks/useVersioning.ts` (+ co-located `useVersioning.test.ts` if present; else add a state round-trip test in plugin-space)

**Interfaces:**

- Produces: `SpaceCapabilities.ReviewMode = 'editing' | 'suggesting' | 'viewing'`; `VersioningState.mode: Record<string, ReviewMode>`; `useVersioning(...)` return gains `mode: ReviewMode` and `setMode: (mode: ReviewMode) => void`.

- [ ] **Step 1: Add the type + state field**

In `capabilities.ts`, inside `SpaceCapabilities`, next to `BranchView`:

```ts
/** Per-user editing posture for a document (Google-Docs-style). Local UI preference, never replicated. */
export type ReviewMode = 'editing' | 'suggesting' | 'viewing';
```

and extend `VersioningState`:

```ts
export type VersioningState = {
  selection: Record<string, VersionSelection>;
  view: Record<string, BranchView>;
  /** Review mode keyed by object id. Missing entry = `editing`. */
  mode: Record<string, ReviewMode>;
};
```

- [ ] **Step 2: Initialise `mode` in the atom**

In the plugin-space capability module that constructs the `VersioningState` atom, add `mode: {}` to the initial value (mirror the existing `selection: {}, view: {}`).

- [ ] **Step 3: Write the failing test for `useVersioning` mode default + setMode**

Add to `useVersioning.test.ts` (create if absent, mirroring the existing hook test harness in the package):

```ts
test('mode defaults to editing and setMode persists per document', async () => {
  const { result } = renderUseVersioning(doc); // existing helper
  expect(result.current.mode).to.eq('editing');
  act(() => result.current.setMode('viewing'));
  expect(result.current.mode).to.eq('viewing');
});
```

- [ ] **Step 4: Run it, expect FAIL** — `~/.proto/bin/moon run plugin-markdown:test -- src/hooks/useVersioning.test.ts` → FAIL (`mode` undefined).

- [ ] **Step 5: Implement in `useVersioning.ts`**

Mirror the existing `view` lines:

```ts
const mode = (documentId && state?.mode[documentId]) || 'editing';

const setMode = useCallback(
  (next: SpaceCapabilities.ReviewMode) => {
    if (!documentId) {
      return;
    }
    setState((current) => ({ ...current, mode: { ...current.mode, [documentId]: next } }));
  },
  [documentId, setState],
);
```

Add `mode` and `setMode` to the returned object.

- [ ] **Step 6: Run it, expect PASS.** Then `~/.proto/bin/moon run plugin-space:build plugin-markdown:build`.

- [ ] **Step 7: Commit** — `versioning: add per-document review mode (editing/suggesting/viewing)`

---

### Task A2: `ReviewRenderPolicy` capability + GDocs-parity default

**Files:**

- Modify + Test: `packages/plugins/plugin-space/src/types/capabilities.ts` (+ `capabilities.test.ts` for the default policy)
- Modify: the plugin-space startup module that contributes default capabilities (grep `Capability.contributes` in `plugin-space/src/capabilities`)

**Interfaces:**

- Produces: `SpaceCapabilities.ReviewRenderPolicy` (capability) of type `ReviewRenderPolicyFn = (mode: ReviewMode) => { showSuggestions: boolean; showComments: boolean; editable: boolean }`; `SpaceCapabilities.defaultReviewRenderPolicy` (the exported GDocs-parity function).

- [ ] **Step 1: Write the failing test for the default policy**

`capabilities.test.ts`:

```ts
import { SpaceCapabilities } from './capabilities';

test('default review render policy matches GDocs parity', ({ expect }) => {
  const p = SpaceCapabilities.defaultReviewRenderPolicy;
  expect(p('editing')).toEqual({ showSuggestions: true, showComments: true, editable: true });
  expect(p('suggesting')).toEqual({ showSuggestions: true, showComments: true, editable: true });
  expect(p('viewing')).toEqual({ showSuggestions: false, showComments: true, editable: false });
});
```

- [ ] **Step 2: Run it, expect FAIL** — `~/.proto/bin/moon run plugin-space:test -- src/types/capabilities.test.ts`.

- [ ] **Step 3: Implement the type, default, and capability**

In `capabilities.ts`:

```ts
export type ReviewRenderConfig = { showSuggestions: boolean; showComments: boolean; editable: boolean };
export type ReviewRenderPolicyFn = (mode: ReviewMode) => ReviewRenderConfig;

/** GDocs parity: Editing/Suggesting overlay suggestions + comments and are editable; Viewing is a clean, read-only read (comments still shown). Override by contributing a stronger capability earlier in plugin order. */
export const defaultReviewRenderPolicy: ReviewRenderPolicyFn = (mode) =>
  mode === 'viewing'
    ? { showSuggestions: false, showComments: true, editable: false }
    : { showSuggestions: true, showComments: true, editable: true };

export const ReviewRenderPolicy = Capability.make<ReviewRenderPolicyFn>(
  `${meta.profile.key}.capability.review-render-policy`,
);
```

- [ ] **Step 4: Contribute the default** in the plugin-space startup module:

```ts
Capability.contributes(SpaceCapabilities.ReviewRenderPolicy, SpaceCapabilities.defaultReviewRenderPolicy);
```

- [ ] **Step 5: Run it, expect PASS.** Then `~/.proto/bin/moon run plugin-space:build`.

- [ ] **Step 6: Commit** — `versioning: add ReviewRenderPolicy capability with GDocs-parity default`

---

### Task A3: Extract suggestion enumeration into a reusable headless component

**Files:**

- Create + Test: `packages/plugins/plugin-comments/src/components/Suggestions/SuggestionSources.tsx` (+ `.stories.tsx` play test)
- Modify: `packages/plugins/plugin-comments/src/components/Suggestions/Suggestions.tsx` (consume the extracted component)

**Interfaces:**

- Produces: `SuggestionSources` — `{ document, authorHues?, onResolved }` where `onResolved: (resolved: ResolvedSuggestionBranch[]) => void`; renders one invisible `BranchContent` probe per active `kind:'suggestion'` branch and calls `onResolved` whenever the resolved set/content changes. `ResolvedSuggestionBranch` already exists in `hooks/suggestion-sources.ts` (`{ author, content, hue? }`).

- [ ] **Step 1: Write the failing play test**

`SuggestionSources.stories.tsx` — seed two suggestion branches (reuse `seedAgentSuggestions` from `CommentsArticle.stories.tsx`), mount `<SuggestionSources>` with an `onResolved` spy, assert it reports two authors with their content. (Story-play form because binding is async/DB-backed.)

- [ ] **Step 2: Run it, expect FAIL** (component missing).

- [ ] **Step 3: Move the probe logic out of `Suggestions.tsx`**

Cut the `branches` enumeration + `contents` state + `BranchContent` child rendering from `Suggestions.tsx` into `SuggestionSources.tsx`. `SuggestionSources` owns the `useObject(document,'history')` re-run, the per-branch `BranchContent` probes, and the resolved-set assembly; it calls `onResolved(resolved)` in an effect when `resolved` changes. Keep `BranchContent` colocated (it is already private to this folder).

```tsx
export const SuggestionSources = ({ document, authorHues, onResolved }: SuggestionSourcesProps) => {
  useObject(document, 'history');
  const branches = (document?.history?.branches ?? []).filter(
    (branch) => branch.status === 'active' && branch.kind === 'suggestion',
  );
  const [contents, setContents] = useState<Record<string, ResolvedSuggestionBranch>>({});
  const setContent = useCallback(/* unchanged dedup setter */, []);
  const resolved = branches.map((b) => contents[b.id]).filter(isNonNullable);
  useEffect(() => { onResolved(resolved); }, [onResolved, JSON.stringify(resolved)]);
  return <>{branches.map((b) => <BranchContent key={b.id} document={document} branch={b} onContent={setContent} />)}</>;
};
```

- [ ] **Step 4: Re-wire `Suggestions.tsx`** to render `<SuggestionSources onResolved={setResolved} />` and pass `buildSuggestionSources(resolved)` to `SuggestionThread` (behaviour unchanged).

- [ ] **Step 5: Run the play test + existing `plugin-comments:test`, expect PASS.**

- [ ] **Step 6: Commit** — `comments: extract SuggestionSources probe for reuse by the editor overlay`

---

### Task A4: Aggregated suggestion overlay extension (reactive sources)

**Files:**

- Create + Test: `packages/plugins/plugin-comments/src/extensions/suggestions-overlay.ts` (+ unit test)
- Modify: `packages/plugins/plugin-comments/src/extensions/index.ts` (export)

**Interfaces:**

- Consumes: `suggestions({ sources, group, onAccept, onReject })` (ui-editor), `buildSuggestionSources` (hooks), a CM `Compartment`.
- Produces: `suggestionsOverlay(): { extension: Extension; reconfigure: (view: EditorView, sources: SuggestionSource[], enabled: boolean) => void }` — a compartment-backed overlay whose `reconfigure` swaps the `suggestions({ sources })` extension live (empty extension when `enabled` is false). Mirrors MarkdownArticle's `compareCompartment` usage.

- [ ] **Step 1: Write the failing test**

Unit test: build an `EditorView` with `suggestionsOverlay().extension`, call `reconfigure(view, sources, true)` with one source that inserts a word, assert `view.state` gains the suggestion decoration facet (assert via `view.state.field(...)` exposed by `suggestions`, or via decoration count). Then `reconfigure(view, [], false)` and assert the overlay is empty.

- [ ] **Step 2: Run it, expect FAIL.**

- [ ] **Step 3: Implement**

```ts
export const suggestionsOverlay = (onAccept?: (h: DiffHunk) => void, onReject?: (h: DiffHunk) => void) => {
  const compartment = new Compartment();
  return {
    extension: compartment.of([]),
    reconfigure: (view: EditorView, sources: SuggestionSource[], enabled: boolean) => {
      view.dispatch({
        effects: compartment.reconfigure(
          enabled && sources.length > 0 ? suggestions({ sources, onAccept, onReject }) : [],
        ),
      });
    },
  };
};
```

- [ ] **Step 4: Run it, expect PASS.** `~/.proto/bin/moon run plugin-comments:build`.

- [ ] **Step 5: Commit** — `comments: compartment-backed aggregated suggestions overlay`

---

### Task A5: Ambient wiring in MarkdownArticle (Editing/Viewing) + mode toggle

**Files:**

- Modify: `packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.tsx`
- Test: `packages/plugins/plugin-markdown/src/containers/MarkdownArticle/DocumentVersioning.stories.tsx` (extend with an ambient play case)

**Interfaces:**

- Consumes: `useVersioning` (`mode`, `setMode`, `selection`), `SpaceCapabilities.ReviewRenderPolicy`, `SuggestionSources` (via a small React bridge that holds `sources` in state), `suggestionsOverlay`, the existing `handleAcceptChange`/`handleRejectChange`.

- [ ] **Step 1: Write the failing play test**

In `DocumentVersioning.stories.tsx`, add `AmbientReview`: seed two suggestion branches on main, `selection = current`, `mode = editing`; assert the editor shows suggestion decorations for both authors and comment highlights; switch mode → `viewing`; assert suggestion decorations disappear but comment highlights remain and the editor is read-only.

- [ ] **Step 2: Run it, expect FAIL.**

- [ ] **Step 3: Read the policy + compute the ambient flags**

Near `reviewBranch`/`suggestionBranch`:

```ts
const renderPolicy = useCapability(SpaceCapabilities.ReviewRenderPolicy) ?? SpaceCapabilities.defaultReviewRenderPolicy;
const ambient = selection.kind === 'current';
const policy = renderPolicy(mode);
// In the ambient default view the editor stays on main; editability + overlays follow the policy.
const ambientEditable = ambient ? policy.editable : true;
```

Fold `ambientEditable` into `effectiveViewMode` (readonly when `!ambientEditable`), guarded so it does not affect the advanced path (only when `ambient`).

- [ ] **Step 4: Bridge live sources from `SuggestionSources` into overlay state**

Hold `const [suggestionSources, setSuggestionSources] = useState<SuggestionSource[]>([])`. Render (invisible) the bridge only in the ambient path:

```tsx
{
  ambient && document && (
    <SuggestionSources
      document={document}
      onResolved={(resolved) => setSuggestionSources(buildSuggestionSources(resolved))}
    />
  );
}
```

(If a cross-plugin import is undesirable, expose the bridge through a `MarkdownCapabilities` slot contributed by plugin-comments — decide in review; default is direct import, plugin-comments already depends on plugin-markdown so the reverse import must go through a capability. **Use a capability slot**: add `MarkdownCapabilities.SuggestionSourcesProvider` contributed by plugin-comments, consumed here — avoids the dependency cycle.)

- [ ] **Step 5: Add the overlay to the editor extensions and reconfigure on change**

Instantiate `const overlay = useMemo(() => suggestionsOverlay(handleAcceptChange, handleRejectChange), [...])`; add `overlay.extension` to `combinedExtensions`; in an effect keyed on `[suggestionSources, ambient, policy.showSuggestions, editorView]` call `overlay.reconfigure(editorView, suggestionSources, ambient && policy.showSuggestions)`.

- [ ] **Step 6: Gate comments by `policy.showComments`** — pass through the existing comment extension provider path (it already renders comments; add a `showComments` guard so Viewing with `showComments:true` still shows them — no change needed for the default, but wire the flag for policy overrides).

- [ ] **Step 7: Add the mode toggle to the toolbar**

In the `customActions` group (next to the branch switcher), add a single-select mode group `Editing / Suggesting / Viewing` calling `setMode`. Disable `Suggesting` until Milestone B lands (tooltip: "Coming soon"), so the control ships without the unimplemented authoring path.

- [ ] **Step 8: Run the play test, expect PASS.** Then `~/.proto/bin/moon run plugin-markdown:build plugin-markdown:lint`.

- [ ] **Step 9: Commit** — `markdown: ambient suggestion overlay + review mode toggle (editing/viewing)`

---

### Task A6: Milestone A verification + docs

- [ ] **Step 1** — `~/.proto/bin/moon run plugin-space:test plugin-comments:test plugin-markdown:test ui-editor:test` all green.
- [ ] **Step 2** — `npx oxfmt --write` the touched files; `~/.proto/bin/moon run :lint` on the four packages.
- [ ] **Step 3** — Update `plugin-comments/DESIGN.md` ambient subsection: mark Editing/Viewing ambient overlay + policy + mode state **landed**; Suggesting mode **pending spike**. Update `.agents/projects/document-revisions/TASKS.md`.
- [ ] **Step 4: Commit** — `docs: mark ambient review Milestone A landed`

---

## Milestone B — Suggesting mode (spike-gated)

### Task B0: Spike — Suggesting-mode editor composition

**Goal:** decide how the editor, while in Suggesting mode, (a) accrues the user's typing to their own `kind:'suggestion'` branch, (b) renders the user's edits as tracked changes vs main, and (c) overlays other authors' suggestions — all on one CodeMirror buffer.

- [ ] **Step 1: Prototype two approaches on a throwaway branch/story**
  - **Approach 1 — self-source injection:** editor bound to main (read-only base); the user's own branch content is added as one more `SuggestionSource` (their author id) in the aggregated overlay; typing is intercepted and applied to the user's branch (not main), so their source re-diffs live. Question: can `suggestions({ sources })` render an _own_ source as editable-in-place, and can keystrokes be routed to the branch doc while the buffer shows main?
  - **Approach 2 — own-changes compartment:** editor bound to the user's branch (typing accrues natively); a dedicated overlay renders the user-branch-vs-main diff as tracked changes; foreign authors' suggestions overlaid read-only. Question: does binding to the branch doc + overlaying its own diff double-render, and how do foreign cursors resolve against the branch doc?
- [ ] **Step 2: Record findings** in `plugin-comments/DESIGN.md` (chosen approach + why + the concrete extension/API shape).
- [ ] **Step 3: Append the detailed B1..Bn TDD tasks** to this plan based on the chosen approach, then implement via the same subagent-driven flow.

> Milestone B implementation tasks are intentionally not pre-written: the buffer-composition approach is undetermined until Task B0. Writing concrete steps now would be speculative. B0's deliverable is the design + the appended task list.

---

## Self-Review

- **Spec coverage:** modes (A1), render policy as product config (A2), ambient overlay as default `current` view (A4/A5), all-suggestions enumeration reuse (A3), inline+companion accept/reject via existing ops (A5 step 5 reuses `handleAcceptChange/Reject`), advanced path retained (A5 gates everything on `ambient`), Suggesting mode (B0+). Comments-always-visible-in-Viewing covered by A2/A5 step 6.
- **Placeholder scan:** Milestone A steps carry concrete code/commands. Milestone B is explicitly spike-gated (not a placeholder — a declared research task with acceptance criteria), per the spec's "spike first" instruction.
- **Type consistency:** `ReviewMode`, `ReviewRenderPolicyFn`, `ResolvedSuggestionBranch`, `SuggestionSource`, `suggestionsOverlay().reconfigure` names are used identically across tasks.
- **Dependency direction:** plugin-comments depends on plugin-markdown; the reverse (MarkdownArticle needing the enumeration) is resolved via a `MarkdownCapabilities.SuggestionSourcesProvider` slot (A5 step 4), not a direct import — no cycle.

---

## Milestone B — Suggesting-mode authoring (A1 bind-to-branch)

A1 ratified by felt-eval (2026-07-22). B0 spike + B1 (`trackChanges` char-level extension + eval
story + hover popover) landed. Remaining B2–B7 below. Root insight from the B1 eval: every
multi-author defect (foreign overlay striking the user's own text, garbled accept, clipped popover)
is the **base-decoupling** problem — overlays diff against the editor doc (the branch) instead of
against `main`. B2 fixes it; B3+ build on it.

### Task B2: Base-decoupling + non-clipped accept/reject popover

**Files:**
- Modify + Test: `packages/ui/ui-editor/src/extensions/review/suggest.ts` (+ `suggest.test.ts`)
- Modify: `packages/ui/ui-editor/src/extensions/review/diff.ts` (add a coordinate-rebase helper)
- Test: `packages/ui/react-ui-editor/src/stories/Suggest.stories.tsx` (multi-author-over-edited-branch case)

**Interfaces:**
- Produces: `suggestions({ sources, base?, group?, onAccept?, onReject? })` — new optional `base`; when
  given, each source is diffed against `base` (not the editor doc) and its hunks are rebased into doc
  coordinates via `rebaseHunks`. Produces `rebaseHunks(base: string, doc: string, hunks: DiffHunk[]): DiffHunk[]`
  in diff.ts — maps a hunk anchored in `base` to the equivalent offset in `doc` using `computeCharHunks(base, doc)`.
- Popover renders via `EditorView`'s tooltip layer (or a `showTooltip`/`hoverTooltip` facet) so it is not
  clipped by `.cm-scroller` overflow.

- [ ] Step 1: Failing unit test in `suggest.test.ts` — `suggestions({ sources:[bob], base })` over a doc
  that has diverged from `base` renders bob's change at the correct doc offset and does NOT strike the
  doc's own added text. (Build a headless `EditorView`; assert decoration positions.)
- [ ] Step 2: Run → FAIL.
- [ ] Step 3: Implement `rebaseHunks` in diff.ts + thread `base` through `suggestions()` (default
  `base = doc` preserves current callers). Diff each source vs `base`, rebase hunk offsets into doc coords.
- [ ] Step 4: Run → PASS.
- [ ] Step 5: Move the accept/reject controls into a non-clipped tooltip layer (replace the
  `position:absolute` popover). Prefer `hoverTooltip` keyed to a suggestion hunk range; keep `.cm-suggest-accept`/`reject`
  test hooks. Verify `Suggest.stories` accept/reject still pass + not clipped (assert the tooltip mounts under `.cm-tooltip`).
- [ ] Step 6: Re-add the second author to `TrackChanges.stories.tsx` using `base: MAIN`; add a play case:
  type in the branch, assert the user's new text is NOT struck and bob's change still renders vs main.
- [ ] Step 7: Build/lint/test green; commit `ui-editor: decouple suggestion base from doc + tooltip popover`.

### Task B3: Wire Suggesting mode into MarkdownArticle

**Files:** Modify `packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.tsx`;
Test `DocumentVersioning.stories.tsx` (+ a Suggesting play case).

- [ ] `mode==='suggesting'` (ambient path): bind the editor to the current user's `kind:'suggestion'`
  branch (find-or-create via `Branch.suggestion`), apply `trackChanges({ main, colour: self })`, and
  overlay other authors via `suggestions({ base: main, sources })` (rebased, from `SuggestionSourcesProvider`,
  excluding self). Editable.
- [ ] Re-add the **Suggesting** toolbar option (remove the hide from the earlier landing polish); wire `setMode('suggesting')`.
- [ ] Play case: switch to Suggesting, type → edit accrues to the user's suggestion branch (assert via the branch content), renders as own tracked change; a second author still shows vs main.
- [ ] Commit `markdown: suggesting mode authors on the user's branch`.

### Task B4: Accept/reject of own tracked changes

**Files:** MarkdownArticle handlers + `plugin-markdown` ops wiring; reuse `AcceptChange`/`RejectChange`.

- [ ] Accepting the user's own insertion/deletion (incl. phantom un-delete) routes through the durable
  ops with the B2 base (`revertHunk`/`cherryPickHunk` against `main`). Reject on a phantom re-inserts main's text into the branch.
- [ ] Test: accept an own change merges to main; reject reverts on the branch. Commit.

### Task B5: Integration coverage

- [ ] Full-stack Suggesting-mode play test (real branch binding) in `CommentsArticle` or `DocumentVersioning`.
- [ ] The deferred `CommentsArticle`↔markdown composition test (editor overlay + companions). Commit.

### Task B6: Hardening

- [ ] Incremental diff / decoration reuse in `trackChanges` (avoid full re-diff per keystroke on large docs).
- [ ] Multi-line/block deletions render sanely; copy excludes phantom text. Tests. Commit.

### Task B7: Ship

- [ ] DESIGN.md: mark Suggesting mode landed; changeset (minor, ui-editor/plugin-markdown/plugin-comments/plugin-space); PR.
