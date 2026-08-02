# Handoff: deck moves on its own (companion/mailbox), app vs storybook

## 1. The issue

In Composer, deck planks move when nothing asked them to: opening a message from the mailbox, and
opening/closing that plank's companion, cause visible jumps. Serial root-causing found and fixed most
of it; the **unifying open defect** is:

> Companion *state* is per-plank (`DeckState.companionPlanks`), but companion *rendering* resolves a
> single anchor from **attention** (`resolveCompanionAnchor` in plugin-deck `util/companion-anchor.ts`,
> consumed by `useRenderedPlanks`/`DeckPlankTile`). Attention traffic therefore re-anchors and resizes
> tiles, producing: phantom opens (state on, nothing rendered), one-frame widen-then-collapse, and
> silent engine scroll shifts (widening a sticky tile moves `scrollLeft` by exactly the width delta
> with **zero** scroll commands — instrument writers and you find nothing).

Planned fix (user-ratified model): render a companion in **every** active plank whose id is in
`companionPlanks`; delete the anchor/attention coupling from the render path. Then remove the
now-superseded pre-paint scroll-restore in `DeckViewport.tsx` (uncommitted). Verify by frame-trace in
both environments (method below).

Remaining separate defect: the mailbox list (`InboxStack`) visibly flashes/re-renders on message
open/close (scroll preserved; likely a remount — untouched, in plugin-inbox).

## 2. What works (verified, frame-traced in the real app)

- Message click → exactly one scroll command, deck arrives and stays (watchdog).
- Companion follows a message swap (level reuse) → pair width never dips, no clamp snap.
- Reveal-on-growth → companion ends fully visible, flush with viewport edge.
- `companionPlanks` pruned/deduped (was 14 entries with dupes in the live profile).
- Storybook `LauncherManual` fixture (a plank whose *content* level-opens a message — the mailbox's
  shape, which no story had) reproduces the app's failure signatures and is the regression net.

## 3. What was tried (condensed)

Five symptom patches each "verified" in storybook and failed in the app: attention-inference collapse
hook + six guards (deleted — replaced by scroll-on-intent), scroll-command dedupe, companion-followup
window, removal of ScrollIntoView-on-companion-open, `useRevealCompanion` v1 (never fired; removed).
Process change that worked: **fixture-first + per-writer stack instrumentation in both environments**
→ found three real causes (click/navigation two-writer collision; smooth-scroll glides silently
aborted by reflow; browser scroll anchoring) — all fixed and committed (`a040f78935`, local only).
Remaining one-frame shift → structural diff of the two scrollers (identical; eliminated) → condition
diff (mid-range scroll + attention movement) → story reproduces a variant → convergent diagnosis
above.

State: branch `claude/plugin-deck-companion-position-0193ec` in worktree
`.claude/worktrees/blissful-nightingale-fc1283`, 24 files ahead of origin/main, **nothing pushed**
(remote branch deleted at #12424 squash). Uncommitted: companion-follows-swap + reveal (both verified,
keep) and the pre-paint restore (superseded, remove). Also on branch: P1–P3 plugin-declared decks
(DeckSpec, Collection seeding + navigability, mailbox levels). Ledger:
`packages/plugins/plugin-deck/TASKS.md`; design record `DESIGN.md` (§12 proposal, §3 scroll rules).

## 4. Working with the user (read before anything else)

- **Never ask the user to test or verify.** 13 round-trips over ~21h were logged and called a
  systematic failure. You have everything: their Chrome via claude-in-chrome MCP (tab on
  `http://localhost:5174`, real mailbox `rich@braneframe.com` in profile), Playwright MCP for the
  worktree storybook on 9021. Verify with frame-level rAF traces + writer instrumentation, in the app.
- **Storybook green ≠ done.** It false-greened five times. When storybook and app diverge, that gap IS
  the diagnosis: diff the environments / degrade one toward the other. No more symptom guards; "drop
  the feature" mitigations are rejected.
- Answer direct questions immediately (a missed "which worktree are you in" caused real anger).
  Concise status; no asking them to choose mid-discovery — propose a default and proceed.
- Decisions already made: companions and levels are **orthogonal** (any plank may show its own
  companion — this ratifies the per-plank render fix); `flatten` becomes `mode: 'solo' | 'deck'`;
  per-collection deck memory later via attention view-state.
- Environment traps: shell resets to the **main checkout** every turn — `cd` to the worktree first,
  never write on main. User's Chrome tab runs ~84.5% page zoom: extension click coords =
  pageCoords / 1.1837; recalibrate with a one-shot pointerdown probe. Synthetic `.click()`/`focus()`
  do not move attention — attention-dependent behavior needs real pointer clicks.
