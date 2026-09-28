---
branch: claude/tasklist-tweaks
commit: a73270543e4d7b941962ab914a888a94754567c5
base: 7602b022059ee234a0422dc91ba16b23c03408a9
mode: pr-only
createdAt: 2026-09-27T07:39:41.098Z
isFinalized: true
groups: 79
rules: [design-tokens-not-raw-spacing-sizing, namespace-export-with-internal-hiding, refactor-must-preserve-behavior]
reviewId: a73270543e
---

_0 error(s), 3 warning(s)._

# WARN a73270543e-1 namespace-export-with-internal-hiding `packages/plugins/plugin-deck/src/index.ts:6`

`export * from './seed/index.ts';` is a blanket wildcard re-export rather than an explicit named export, the pattern `namespace-export-with-internal-hiding` flags. `seed/index.ts` itself already names its one export (`export * as DeckSeed from './DeckSeed.ts'`), so the top-level barrel should re-export that name explicitly too — `export * as DeckSeed from './seed/index.ts';` — instead of wildcarding the sub-barrel's contents into the package's public surface.

# WARN a73270543e-2 refactor-must-preserve-behavior `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:314:9`

The refactor that unwraps `TaskList.Editor` from its outer `<div className='px-trim-md'>` (rule `refactor-must-preserve-behavior`) drops the previous `border-x border-t border-separator rounded-t-md` styling — the editor now renders with no border/rounded-top at all — while the retained comment still says "Bordered on three sides" and describes reproducing the old wrapper's inset via `mx-trim-md`, a class that does not appear anywhere in the new `classNames='bg-input-surface px-15 py-2'`. Either the border/rounded-corner styling needs to be restored (e.g. via the described `mx-trim-md` approach) or the comment needs to be rewritten to match what the code now actually does — right now the comment documents behavior the refactor silently removed.

# WARN a73270543e-3 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:317`

`classNames='bg-input-surface px-15 py-2'` uses the raw Tailwind spacing class `px-15` (a large, arbitrary-looking 3.75rem inset) instead of a semantic token, even though the comment directly above it (lines 313-316) explains that `mx-trim-md` is the intended token for this inset and that the old wrapper div used `px-trim-md`. The code no longer matches its own comment — the border/rounded-corner classes described as needed are also missing from the final `classNames` — so this looks like a raw value was left in place of the semantic `mx-trim-md`/`px-trim-md` token the surrounding prose calls for.
