# Document Review — Test Plan

Companion to [DESIGN.md](./DESIGN.md). Three tiers, mirroring the spec's layers; a feature is covered
only when all applicable tiers pass. Results and incident history live in the project ledger, not
here — this document is the timeless script.

## Tiers

1. **Model** — pure/unit tests per invariant (see DESIGN.md §2; each invariant names its test).
2. **Editor** — storybook plays driving the real CodeMirror view (`moon run plugin-review:test-storybook`,
   also in CI). Every interactive defect is reproduced here before it is fixed.
3. **Walkthrough** — the numbered scripts below, run against the storybook stories
   (`stories/DocumentVersioning/*`, `containers/CommentsArticle/*`). The agent runs them headlessly
   first; a human pass confirms feel (latency, flicker) that assertions cannot.

Conventions: stories seed all state before mount (reload = reset); play-driven stories carry a `Test`
suffix, hands-on stories the plain name; report failures by step number (e.g. "F1.3").

## Shared scenarios

Core editing behaviour (default and Suggesting typing/deletion) is specified once as data —
`src/testing/scenarios.ts` defines each scenario as a setup (main content + foreign suggestions)
plus a step list (mode selections, edits, expectations). Two executors interpret the SAME objects:

- **Headless** (`src/testing/scenario-executor.tsx`, run by `src/testing/scenarios.test.tsx`) —
  mounts the real binding pipeline (`useMarkdownEditorBinding`) via `renderHook` and a real
  `EditorView` wired the way `MarkdownEditorContent` wires it (automerge source + binding extensions
  in a live compartment).
- **Storybook** (`src/testing/scenario-executor-storybook.ts`, run by the
  `DocumentVersioning / Scenario*Test` plays) — drives the full plugin stack: the real toolbar
  dropdown, the mounted editor, and the live decorations.

The tiers cannot drift: a new step kind fails both executors at compile time until each interprets
it, and a scenario edit re-specifies both tests at once. Add new editing behaviour as a scenario
first; reach for a bespoke play only when the behaviour is not expressible as scenario steps
(e.g. DOM-identity assertions like `SuggestingSwapTest`).

## F1 — Suggesting (own edits)

Story: `DocumentVersioning / Suggesting` (seeded: multi-paragraph document, a bullet list, another
author's suggestions including one at the document end, one anchored comment).

1. Switch the view-mode dropdown to Suggesting: the editor does not remount — no flicker, no scroll
   jump, the gutter column does not appear or shift.
2. Type mid-paragraph: the text renders as your own tracked change (your colour, underlined, change
   bar); caret and focus survive every keystroke; the document (main) is unchanged until Accept.
3. Delete a few words: one strikethrough covering exactly what you deleted; hover → restore.
4. Delete a range cutting into the words at both ends: the strike still covers only what you removed.
5. Delete a whole bullet: the phantom preserves the list structure.
6. Move the caret past the trailing suggestion to the document end and type: reachable, text lands
   after the suggestion.
7. Round-trip every mode, including Read only, ending in Suggesting: editable, suggestions visible,
   caret and selection where you left them.
8. Between two Suggesting sessions, type on main (in Markdown mode): re-entering Suggesting shows
   your main edit as plain text — never struck through — and your earlier suggestions intact.

## F2 — Ambient review (others' suggestions)

Story: `DocumentVersioning / AmbientReview` (seeded: two authors' suggestions in distinct hues, one
anchored comment).

1. Both authors overlay in their own colours with change bars; the comment highlight coexists.
2. Hover a change: the Accept/Reject popover opens, stays anchored while the pointer crosses the
   change, and survives the pointer moving into it.
3. Accept: the change folds into the document; its decorations, card and popover clear; the other
   author is untouched. Undo restores.
4. Reject: the suggestion clears; the document is unchanged.
5. Click the comment highlight under an overlay: the thread activates (the overlay must not eat it).
6. Click a change in the document: its card accents. Click a card: the caret moves to the change and
   the editor takes focus.
7. Toggle an author's visibility off: their decorations, bars and cards disappear; toggle on: they
   return. Other authors unaffected.

## F3 — Typing stability (editing posture)

Story: `DocumentVersioning / EditingTyping`.

1. Type steadily with suggestions visible: no caret jump, no dropped keys, no strikethrough of your
   own text, no suggestion branch created for your keystrokes.
2. Toggle view modes between bursts: content stable.

## F4 — Companion review

Story: `CommentsArticle / WithAgentSuggestions`.

1. One card per grouped change per author; colours consistent across card, decoration and timeline.
2. Accept folds the change and removes the card; Reject clears it leaving the text untouched.
3. Card click ↔ document click share one current-change selection.

## F5 — Comments and suggestions together

Story: `CommentsArticle / WithCommentsAndSuggestions`.

1. Threads and suggestion cards are visually distinct; both render in the editor without one
   swallowing the other's styling or clicks.
2. Click-reveal works in both directions for both kinds.

## F6 — Baseline (control)

Story: `DocumentVersioning / Default` (no review host).

1. Plain document: no review chrome, no decorations, no gutter artifacts.
2. Typing is clean. Any defect reproducible here is not a review-layer bug.

## Advanced path (drafts and history)

Covered by the play-driven stories (`TimeTravel`, `BranchRevisions`, `BranchMerge`, `ChainedBranches`,
`ConflictAutoResolve`, `ConflictResolution`): checkpoints and time travel, branch revisions and tips,
merge-back, chained fork/merge, CRDT auto-merge, and marker-based conflict resolution.
