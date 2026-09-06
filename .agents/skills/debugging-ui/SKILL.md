---
name: debugging-ui
description: Use when debugging any UI bug — wrong rendering, layout or scroll jumps, flicker/flash, styling, interaction, focus/attention, or reactivity failures — in Composer plugins, react-ui components, storybook stories, or the running app. Applies from the first symptom report, before proposing any fix.
---

# Debugging UI

## Core principle

**The user is the most expensive and least available instrument you have.** Every
verification you can perform yourself — running a test, driving a browser, reading a
frame trace — is strictly cheaper than asking the user to look. A debugging process
that consumes user round-trips is a failing process even when it eventually finds the
bug. One real session burned 13 user test-asks over 21 hours; every correction that
worked came from the user, not the agent. This skill exists so that never happens again.

Violating the letter of these rules is violating their spirit.

## The golden rule — assess after EVERY code change

Above everything else in this skill: at the end of each code change or
intervention, stop and answer three questions, in the report:

1. **Outcome** — do we understand what this change did, and can we measure it?
   An intervention whose outcome you cannot observe and measure taught nothing;
   revert it rather than stacking the next one on top.
2. **Quality** — regardless of whether it resolves the bug, does EVERY change
   currently in the tree improve the overall quality of the system? Instrumentation
   is exempt (it is marked and removed); guards, workarounds, and "temporary"
   patches are not. A fix that degrades the code is not a fix.
3. **Complexity** — are we adding complexity to solve the problem? Added
   complexity is evidence you are patching a symptom at the wrong level; prefer the
   change that deletes the defective coupling over the change that compensates
   for it.

## The repro is the contract — establish it FIRST

**Your first message on any bug report MUST contain a `Repro contract` block with
these three slots filled in:**

```text
Repro contract
1. User repro: <steps / story / recording, or "not provided yet">
2. My candidate repro: <numbered steps + the measurement that detects the failure>
3. Acceptance criteria: <what observation, in which environment, counts as fixed>
```

This is the one mandatory ask in this skill and it **overrides this workflow's own
default to work autonomously without asking**. It is not a verification ask: it costs the user seconds, and it is the
single highest-value thing they own. It does not count against the diagnostic-ask
budget. Their repro encodes environment state (experiments enabled, profile data,
scroll position, plank count) you will otherwise burn hours rediscovering — and a
repro you invent alone may reproduce _a_ bug that is not _their_ bug.

**Do not block on the answer.** Send the block, then keep investigating with your
own candidate repro in parallel; reconcile the moment they reply. Blocking wastes
your time; not asking wastes theirs.

Before attempting any fix, produce two things and get them confirmed:

1. **A clear statement of the issue** — observable symptom, trigger gesture,
   expected vs. actual.
2. **A runnable repro** that BOTH you and the user can run — a story, a test, or
   an exact numbered gesture script against the app (seeded with the user's repro
   if they have one) — plus the measurement that detects the failure (frame trace,
   DOM-identity probe, assertion).

Then confirm, with evidence, that (a) the repro demonstrates the _actual reported
problem_ (not a lookalike), and (b) you can reproduce and measure the failure
**consistently** — an intermittent or unmeasured repro is not yet a repro. The
repro is the contract between you and the user: it defines what "fixed" means,
the user can run it to audit any claim, and no fix claim is valid except against
it. If the repro later turns out not to match the user's symptom, say so
immediately — the contract is renegotiated, not silently swapped.

## Step 0 — Inventory your instruments (before touching code)

Identify what you can drive yourself, in this order of cost:

| Instrument                                 | Use for                                                         |
| ------------------------------------------ | --------------------------------------------------------------- |
| Unit tests (vitest)                        | State/logic isolation; cheapest repro                           |
| Storybook stories + play scripts           | Component/container behavior; deterministic fixtures            |
| Playwright / browser MCP against storybook | Gestures, frame traces, console, screenshots                    |
| Browser MCP against the running app        | The bug as the user actually sees it                            |
| Runtime log instrumentation                | See the `debugging` skill (@dxos/log → app.log pipeline)        |
| The user                                   | Only what no tool can observe (their environment, their intent) |

**Check for running servers before starting new ones** (`lsof -nP -iTCP -sTCP:LISTEN`,
then which worktree owns each — another session's storybook or app server may already
be serving). Serve this worktree on a free port. **A server you did not start is never
yours to kill or restart — even when it serves this worktree**: the user or another
session may be attached to it. Never `pkill` by pattern (`vite`, `storybook`, …); it
reaches across every worktree and session on the machine. If a server you need must
change (port, env, restart), state the intent and ask.

**A wedged storybook is evidence, not an obstacle.** The dev server periodically
stops answering (or answers while pegging a core) and the reflex is to restart it
— which destroys the only record of why. `serve` arms a watcher that captures
automatically; if the server was started another way, run
`bash tools/storybook-react/diagnose.sh` BEFORE restarting. Report the path it
writes. Note also that more than one storybook may be alive: an orphaned keeper
from a dead session was found restarting one for five days, so the server you are
measuring may be competing with another for CPU and file watchers.

If you cannot drive a browser at all, say so in your first report and agree the
verification protocol up front — do not discover this mid-loop.

## Check the classes are real before debugging the layout

A layout that is "wrong for no reason" is often a class that does not exist. The
`tailwindcss-logical` dialect (`pis-*`, `pbs-*`, `pli-*`, `mis-*`, `is-*`, `bs-*`, `min-bs-*`, …) was
dropped in the Tailwind v4 migration and compiles to **nothing** — no error, no lint, no warning.

Before forming a hypothesis about a spacing, sizing or overflow bug:

```bash
git diff | grep -nE '\b(p|m)(is|ie|bs|be|li|lb)-|\b(min-|max-)?(is|bs)-'
```

Then confirm in the browser rather than in the source: read the element's computed style and check the
property is actually set. A class that produces no rule is invisible in the source and obvious in
`getComputedStyle` — which is the cheapest rung on the ladder below, and the one to try first when the
symptom is geometric. Replacement table in **composer-ui** § "Sizing vs logical utilities".

## The isolation ladder

Start at the level where the bug manifests — usually the app. **After 2–3 failed
attempts at one level, step DOWN a level** and reproduce the bug in a smaller demo:

```text
app  →  storybook story (fixture-first)  →  unit test
```

- A failed attempt = an instrumented hypothesis test or candidate fix that did not
  change the observed symptom. Count them.
- Stepping down means building a progressively smaller demo of the same behavior —
  a story with the app's exact shape (fixture-first), then a unit test on the
  suspect state transition. If the lower-level story/test doesn't exist and would
  improve the codebase, write it; it becomes the regression net.
- **When two levels disagree** (story green, app broken), the divergence IS the
  diagnosis: diff the environments — structure, then conditions (attention traffic,
  scroll position, timing, real vs synthetic input) — and degrade one toward the
  other until the signatures match. Do not patch the symptom at the level that
  happens to be green.

## Verification contract

A bug is **fixed** only when the agreed repro passes — the original symptom is
observed gone, by you, in the environment where it was reported, measured the same
way the repro measured the failure (frame trace, screenshot, console/log capture). Anything less is a **candidate fix**, and every status line —
especially the one-sentence summary — must say so: "candidate fix — verified in
<level>, not yet in <reporting environment>". Never write "fixed"/"resolved" on
lower-level evidence, however strong. If the reporting environment needs state only
the user has (their profile, their data), first try to drive it yourself with browser
tools; ask only if no tool reaches it.

- Storybook green ≠ done. Your own metric green ≠ done. Build/lint/tests green ≠ done.
- Rule out your own measurement artifacts (hidden tabs suspend rAF; synthetic
  `.click()` does not move attention/focus; smooth-scroll glides abort on reflow)
  before trusting a trace — and before blaming the code.
- Never propose removing a working feature as the fix; that is a symptom patch with
  the largest possible blast radius.

## Interaction budget

- **Answer any direct user question immediately**, before continuing work — even
  mid-investigation. An unanswered question outranks your current step.
- **Front-load asks.** At start, list everything only the user can provide —
  starting with "do you have a repro?" and the acceptance criteria, plus
  reproduction environment, gestures you cannot synthesize, credentials, judgment
  calls — and request it in one batch. An experiment that needs user feedback stalls
  by default — design it out.
- **Count your diagnostic asks** (reproduce / verify / observe requests). Budget: 3
  per bug. When you hit it without having identified the problem, your process is
  failing — stop, say so, and discuss the approach itself with the user.
- Each ask must be: (a) precise — numbered steps, exact expected/actual observation;
  (b) maximally terse; (c) justified — state what the answer buys that no tool could.

## Report shape

Every status message to the user is, in order:

0. **Repro contract** — in the first message only, the three-slot block above.
1. **Problem** — one sentence: the current problem you are trying to solve (not the
   original symptom — the live sub-problem). If you cannot state it, that is the
   finding: say "I do not have a solid plan" and what you'll do to get one.
2. **Plan** — the next 1–3 concrete steps and which instrument each uses.
3. **Golden rule** — after any code change: the outcome / quality / complexity
   assessment (see above).
4. **Ask** — nothing, or the batched precise asks (counted).

## Rationalizations — all of these mean STOP

| Excuse                                          | Reality                                                                          |
| ----------------------------------------------- | -------------------------------------------------------------------------------- |
| "Quicker to ask the user to check"              | 13 asks / 21 hours. Drive the browser yourself.                                  |
| "It passed in storybook, so it's fixed"         | It false-greened five times in one session. Verify in the reporting environment. |
| "My metric is green — declaring resolved"       | The user's symptom, in the user's environment, is the only exit criterion.       |
| "One more guard will catch this case"           | Six guards later the hook was deleted. Step down the ladder instead.             |
| "Simplest fix: drop the feature"                | Rejected on sight. Find the environment difference.                              |
| "I'll answer their question after this step"    | Answer it now. A missed direct question destroys trust.                          |
| "Another attempt at this level might work"      | You are at 3. The ladder exists because it won't.                                |
| "I'll fix it first, build the repro after"      | Without the repro contract no claim is auditable. Repro first.                   |
| "I'm autonomous — I'll derive the repro myself" | The contract block is mandatory and non-blocking. Send it, then keep working.    |
| "My repro reproduces it, so it's their bug"     | Yours may be a lookalike with different state. Reconcile against theirs.         |

## Red flags — self-check while working

- About to ask the user to reproduce/verify anything → can a tool observe it?
- You started diagnosing without asking whether the user has a repro and agreeing
  acceptance criteria → back to the opening contract.
- About to edit code before a confirmed, measurable repro exists → contract first.
- About to write "fixed"/"resolved" → has the agreed repro passed, run by YOU, in the
  reporting environment?
- A change just landed and you haven't written the outcome/quality/complexity
  assessment → golden rule before the next intervention.
- Third attempt at the same level → step down; build the smaller demo.
- Patch references attention/focus/timing you don't understand yet → hypothesis
  first (see `debugging` for instrumentation), fix second.
- You started a server without checking what was already running.
- You are about to kill or restart a server you did not start — or to `pkill` by
  pattern. Stop; state intent and ask.

## Related skills

- `debugging` — @dxos/log runtime instrumentation pipeline (app.log / test-browser.log,
  `#region DEBUG` markers, query-logs.mjs) for hypothesis testing at any ladder level.
- `reactivity` — when the symptom is stale or missing data (updates only after navigating
  away and back, items absent on cold load), the diagnosis usually lands on one of its
  numbered anti-patterns; load it before writing the fix.
- `composer-ui` — storybook setup and story conventions for new fixtures.
- `browser-e2e-tests` — Playwright targeting rules (data-testid) when a repro
  graduates to a regression spec.
