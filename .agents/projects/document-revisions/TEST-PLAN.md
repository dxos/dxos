# Document Revisions & Review — Test Plan & Follow-Along Script

Manual verification for the suggestion / comment / versioning feature set. Two parts:

1. **Storybook checklist** — fast, isolated, deterministic (play functions already assert much of this;
   this is the eyeball pass).
2. **App script** — end-to-end in Composer with a realistic document, in the order a real reviewer works.

Legend: ☐ = to verify. Note anything that differs from **Expected**.

> ⚠️ **Known open design issue — read first: [§0 View-mode ↔ review-mode coupling](#0-open-design-issue).**
> The reported "edit disappears when I switch to plain-text then back to markdown" is this. It is a
> **visibility** issue, not data loss (the edit stays on your branch; reload shows it). Decide the model
> before treating other mode-switch observations as bugs.

---

## 0. Open design issue — view-mode ↔ review-mode coupling

**What happens.** The review posture (Editing / Suggesting / Viewing) is now folded into the editor
view-mode dropdown. Selecting a built-in view mode also sets the posture:

| Dropdown entry | Editor view mode       | Review posture (`mode`) | Suggestions shown? |
| -------------- | ---------------------- | ----------------------- | ------------------ |
| Source         | source (raw)           | editing                 | yes                |
| Preview        | preview (rendered)     | **viewing**             | **no** (policy)    |
| Read-only      | readonly               | **viewing**             | **no** (policy)    |
| Suggesting     | (bound to your branch) | suggesting              | yes (yours inline) |

So going **Suggesting → Source → Preview** lands you in `viewing`, and `viewing`'s render policy
(`showSuggestions:false`) hides every suggestion — including your own in-progress one. It is still on
your suggestion branch (visible in the comments/suggestions companion), and a reload resets `mode` to
`editing` (the aspect is in-memory) so it reappears. **No data is lost.**

**The smell.** "Render mode" (source vs rendered preview) and "review posture" (do I see suggestions)
are two different axes that got conflated. "Preview" reads as "just render the markdown", not "hide my
edits".

**Options to pick from (morning):**

1. **Decouple** — built-in view modes set only the editor view mode and never force `viewing`; leaving
   Suggesting drops to `editing`. Suggestions stay visible across source/preview/readonly. `viewing`
   becomes reachable only via a future explicit "Viewing" entry (or drop it). _Simplest fix for the
   reported bug; loses the one-click clean-read until a Viewing entry is added._
2. **Viewing shows suggestions read-only** — change `defaultReviewRenderPolicy` so `viewing` keeps
   `showSuggestions:true` but `editable:false`. Preview/Read-only then render with suggestions visible
   but non-interactive. _Keeps the mapping; changes what "Viewing" means._
3. **Keep as-is** — treat it as intended GDocs-style (Viewing = clean read). Only add a tooltip/hint so
   it's not surprising. _Least code; the reported behaviour stands._

I did **not** change this overnight — it's your call. Everything below assumes the current (option 3)
behaviour so you can feel it before deciding.

---

## 1. Storybook checklist

Serve: `moon run storybook-react:serve` (port 9009) — or reuse your running instance. Navigate to each
story and eyeball. (Most have play functions that already assert the core path; watch them run green,
then interact manually.)

### plugins/plugin-markdown/containers/DocumentVersioning

- ☐ **TimeTravel** — create checkpoints on main; click older revisions (editor shows that snapshot,
  read-only); click **Now** to return. Timeline git-graph renders the lane.
- ☐ **BranchRevisions** — select a revision _on a branch_ (read-only), then the branch **Tip** (editable).
- ☐ **BranchMerge** — merge a branch back via the History panel **Merge** button; timeline collapses the lane.
- ☐ **ChainedBranches** — fork → merge → fork again → merge (flat registry; no nesting).
- ☐ **ConflictAutoResolve** — concurrent same-line edits CRDT-merge with **no** conflict markers.
- ☐ **ConflictResolution** — the marker-resolution UI (Accept branch / current / both) for a legacy block.
- ☐ **AmbientReview** — default view overlays _both_ seeded authors' suggestions **and** the comment
  highlight; editor editable (Editing). Use the **View mode** dropdown → **Read-only**: suggestions
  disappear, the comment stays, editor read-only. Back to **Source**: suggestions return.
  - ☐ **NEW: check indicator** — open the View mode dropdown; the current entry has a **✓** on its row.
  - ☐ **NEW: change-bar gutter** — lines carrying a suggestion show a thin **vertical bar in the
    author's colour** in the gutter; unchanged lines have none. Two authors on different lines → two colours.
- ☐ **Suggesting** — View mode → **Suggesting**: editor rebinds to _your_ branch; type — your text is
  green/your-colour (tracked insert), a second author (Bob) still overlays vs main and does **not**
  strike your text. Your change-bar is your colour.
  - ☐ **NEW: un-delete** — delete a word (strikethrough phantom appears); hover it → a **restore**
    control floats above; click → the word returns and the phantom clears.

### plugins/plugin-comments/containers/CommentsArticle

- ☐ **WithComments** — existing comment threads render; select text → comment affordance.
- ☐ **WithAgentSuggestions** — seeded suggestions appear as cards in the companion + overlaid inline;
  layout is comments-top / history-bottom in the right column.
- ☐ **NEW: comment flash** — create a comment and press Enter to submit the first message. Watch closely:
  the thread must **not** blink out and back. It stays put through the draft→persisted handoff.

### plugins/plugin-comments/components/SuggestionThread & SuggestionSources

- ☐ **SuggestionThread / AcceptReject** — per-change Accept/Reject on a proposal card.
- ☐ **SuggestionSources / Default + SwapDocument** — multi-author enumeration; swapping the document
  re-resolves sources (no stale overlay).

---

## 2. App follow-along script (Composer)

Use a **realistic document** — paste the sample in §3 into a new Markdown document so there are
headings, lists, code, and multiple paragraphs to review.

Two participants make multi-author scenarios real: use two browser profiles / spaces, or seed a second
author via the storybook path. Solo is fine for everything except the multi-author overlay.

### 2A. Comments

- ☐ Select a phrase in a paragraph → add a comment → type a message → **Enter**. Thread appears in the
  companion; **no flash** (§1 regression).
- ☐ Reply to the thread; resolve it; toggle **Active / All** comments.
- ☐ Delete a thread (undo restores it).
- ☐ Comment on a **heading** and on a **list item** — anchors land on the right text.

### 2B. Suggesting (your own edits)

- ☐ View mode → **Suggesting**. Editor rebinds to your suggestion branch (title/tabs unaffected).
- ☐ Insert a sentence mid-paragraph → renders in **your colour**, underlined; gutter change-bar in your colour.
- ☐ Delete a few words → strikethrough phantom; **hover → restore** returns them.
- ☐ Delete an entire list item / a fenced code line → the phantom preserves the line break (block deletion).
- ☐ Multi-line: delete a whole paragraph → single phantom spanning the removed lines.
- ☐ Open the **comments/suggestions companion** — your suggestion is listed as a card.
- ☐ **Mode-switch matrix (the reported flow — see §0):** from Suggesting, switch to **Source**, then
  **Preview**, then **Read-only**, then back to **Suggesting**. Note at each step whether your edit is
  visible inline and whether it's in the companion. (Expected under current behaviour: hidden in
  Preview/Read-only, visible in Source/Suggesting, always in the companion, always recoverable.)

### 2C. Reviewing others' suggestions (needs a 2nd author)

- ☐ In **Editing** (default) view: the other author's changes overlay inline in _their_ colour, with a
  gutter bar; comment highlights coexist.
- ☐ Hover an overlaid change → the **Accept / Reject** popover appears (in the tooltip layer, not clipped).
- ☐ **Accept** one change → it merges into main and the overlay for it clears. **Reject** another → it
  disappears without changing main.
- ☐ Two authors editing near the same line → both bars/overlays attribute correctly (no strike of your text).

### 2D. Versioning / History companion (the advanced path)

- ☐ Open the **History** companion. Create a named checkpoint; it appears on the timeline.
- ☐ Click an older checkpoint → editor shows the snapshot (read-only) → **Now** returns.
- ☐ **New branch** from a revision; switch to it via the timeline; edit it; **Merge** it back.
- ☐ Confirm the toolbar has **no** branch-selector dropdown anymore (removed — the companion is the path).
  The `[Base | Diff | Branch]` banner still appears when a branch is selected via the companion.

### 2E. Persistence / regressions

- ☐ Reload mid-review — suggestions and comments reappear; nothing is lost (view posture resets to Editing).
- ☐ A plain Markdown doc opened via a surface with **no** versioning provider (e.g. a preview/card)
  still renders and edits normally (no crash, no version UI).

---

## 3. Sample realistic document

Paste the block below (it deliberately contains headings, a bulleted list, a numbered list, and a
fenced code block so every anchor / block-deletion case has something to hit).

````markdown
# Q3 Engineering Review

## Summary

The platform team shipped the new sync pipeline and cut p95 latency by 38%. Two
follow-ups remain before GA: backpressure handling and the migration tooling.

## Highlights

- Sync pipeline rewrite landed (see RFC-142).
- Latency: p95 380ms → 235ms.
- Onboarded three design partners.

## Risks

1. Backpressure under burst load is untested at scale.
2. The migration script has no dry-run mode.

## Appendix

```ts
const rollout = { cohort: 'beta', percent: 10 };
```

Notes: revisit the cohort percentage after the first week.
````

---

## 4. What each feature maps to (for filing issues precisely)

- Change-bar gutter → `@dxos/ui-editor` `change-bar.ts` (fed by `trackChanges` + `suggestions`).
- Own tracked edits + phantom + restore → `track-changes.ts`.
- Foreign overlay + Accept/Reject popover → `suggest.ts` (+ `suggestions-overlay.ts`).
- View-mode dropdown + Suggesting entry → `react-ui-editor` `view-mode.ts`; `plugin-markdown`
  `MarkdownArticle` (assembly) + `MarkdownCapabilities.ViewModeExtension`; `plugin-comments`
  `markdown-extension.ts` (contributes "Suggesting").
- Dropdown check indicator → `react-ui-menu` `DropdownMenu.tsx`.
- Comment flash → `plugin-comments` `add-message.ts` (order) + `CommentsArticle.tsx` (dedupe).
- History companion (timeline/branches/checkpoints) → `plugin-versioning` `ObjectHistory.tsx`.
- Review posture ↔ render policy → `plugin-versioning` `VersioningCapabilities` (`viewAspect`,
  `defaultReviewRenderPolicy`); consumed in `MarkdownArticle`.

```

```
