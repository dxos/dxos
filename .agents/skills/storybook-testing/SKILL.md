---
name: storybook-testing
description: >-
  Driving storybook as a verification tool — serving a story, smoke-loading it, running a review
  walkthrough with the user, authoring a story test plan, and debugging a defect it surfaces. Use
  when verifying a UI change in storybook, resolving a story id, structuring a `.stories.tsx`
  (DefaultStory + args, play stories vs hands-on stories), writing or updating a TEST-PLAN, or
  touching the shared config in `tools/storybook-react/.storybook`.
---

# Storybook testing

How to use storybook to verify work. Authoring a component's _first_ story (decorators,
`withTheme()`, `parameters: { translations }`) is [[composer-ui]] — this skill covers what happens
after the story exists: serving it, proving it loads, handing it to a human, and chasing what it
surfaces.

## Serving a storybook

**Never touch port 9009.** That is the user's aggregate storybook
(`moon run storybook-react:serve`); killing or reusing it destroys their working state.

Serve the package under test on a free port, **from the worktree you edited**:

```bash
pnpm exec storybook dev -p 9014 --no-open
```

Run it detached with output redirected to a log file, then poll the port. Serving from the primary
checkout renders MAIN's files and silently masks worktree edits — a story that "doesn't exist" or
"didn't change" is usually this.

Check the port is actually free first; a previous session may still own it:

```bash
lsof -i:9014 -sTCP:LISTEN
```

On a taken port `storybook dev` does **not** fail. It prompts on stdin ("Port 9014 is not available.
Would you like to run Storybook on port 9015 instead?") and waits forever, so a detached run looks
alive but never binds.

### Story ids

The id is `<title-slug>--<export-name-slug>`: exporting `Default` from
`title: 'plugins/plugin-review/components/CommentThread'` gives
`plugins-plugin-review-components-commentthread--default`.

It derives from the meta `title` and the **export name**, never from a story's `name` — so renaming
for display is safe, but moving a file or renaming an export changes the id. Titles mirror the file
path by convention only; no tooling enforces it. Read ids rather than guessing them:

```bash
curl -s http://localhost:9014/index.json
```

Then open `http://localhost:9014/iframe.html?id=<story-id>&viewMode=story`.

### Stale module graph after moving or renaming files

Moving or renaming a file leaves vite's module graph stale: the browser reports
`Failed to fetch dynamically imported module` against a `?t=…` URL that still returns 200.
**Reloading does not clear it — restart the dev server.** Don't debug the import. This bites
`serve-min` the same way.

## Smoke-load before handing anything to a human

Open the story yourself and assert it rendered **before** giving the user a test script — wait for a
known element (`.cm-content`) or a fixture string. A green build and a green typecheck say nothing
about whether a story mounts.

Full plugin-stack stories take 10–20s to first paint. Poll for the expected element; an early
screenshot shows an empty frame and reads as a failure.

## The review walkthrough

The agent drives, the user tests.

1. **Smoke-load each story before handing it over** and say what you verified. Non-negotiable.
2. Hand over **one story at a time**, numbered steps inline, and name what comes next.
3. Report gaps you find yourself **before** the user tests — a fixture that never fires means telling
   them to skip that step, not letting them chase it.
4. The user reports failures by step number. **Log them; do not fix until the whole pass is done.**
   Fixing mid-walkthrough is a trap: a later story routinely reframes earlier reports.
5. Write each batch into the project `TASKS.md` and commit, so nothing depends on the session
   surviving.
6. Close with a proposed **triage order and a recommendation**, not a flat list.

**Always include a control/baseline story** — the same surface with the feature switched off. In the
plugin-review walkthrough the baseline collapsed three separately-reported issues into one bug.

## Story file structure

- **One `DefaultStory` on `meta.render`; variation via `args` only.** Per-story `render:` overrides
  duplicate setup and drift.
- **Setup a tester depends on belongs in `args`**, consumed by the decorator **before mount** —
  never in a play function. A hands-on tester never runs the play function's setup.
- **A story with a `play` must not carry a manual `Test:` script.** Opening it runs the script and
  leaves the UI past the state the script describes.
- **On a play/manual collision, the automated story takes a `Test` suffix** (`SuggestingTest`); the
  plain name (`Suggesting`) belongs to the hands-on story. A `_` prefix does **not** work — Storybook
  strips a leading underscore from both the id and the display name, so `_Suggesting` and
  `Suggesting` collide.
- **Declare play stories last in the file** — see the sort note below.
- **Manual scripts are numbered steps** in the JSDoc `Test:` block, so failures are reported as
  "S1.3" and land in a tracker unambiguously.

## Test plans

A package's TEST-PLAN carries two tables — **automated** (play-asserted; runs under
`moon run <pkg>:test-storybook` and CI) and **manual** (judgment). Each row: the story, and what it
asserts or what to verify.

- **Word each row as the user-visible outcome, not the internal seam — then cover it.** A
  plugin-review manual row read "Accept/Reject route to ops", which stayed literally true while the
  buttons did nothing: the op fired and the document never changed. No automated test covered the
  path at all. Write "Accept folds the change into the document" instead, and **state plainly in the
  plan which rows have no automated backing** — a row phrased as a dispatch describes a seam that
  cannot fail, so it hides both the broken feature and the missing coverage.
- Stories tagged `['!test']` never run in CI. Say so in the plan and state _why_ per story, or the
  plan overstates its coverage.
- Record results with dates, and keep issue ids stable once reported.
- A story with no play still counts as a smoke test in `test-storybook`, so adding play-free manual
  stories increases real coverage.

## Debugging what a story surfaces

The sequence that found the canonical bug, in order:

1. **Split harness from product first.** Toggle the plugin off/on in the app's plugin registry. Ours:
   editor fine with plugin-review disabled, focus lost per keystroke once enabled → product, not
   storybook.
2. **Reproduce headlessly** in the browser pane — `computer` click into the editor, `type` a few
   characters, then assert `document.activeElement.closest('.cm-editor')` and that the text landed.
   Cheaper and far more reliable than asking a human to re-demonstrate.
3. **Instrument with a render-diff probe** instead of guessing: hold a `useRef` of the previous value
   of every candidate and log which keys changed identity per render. Ours printed
   `changed: versioning` and nothing else, falsifying the leading hypothesis in one step.
4. **Probe the identity the consumer depends on.** The culprit's _fields_ were all stable — the probe
   compared fields, the consumer compared the object.
5. Remove instrumentation, apply the fix, **re-run the same headless repro** as proof, then the suite.

Canonical shape: `useMarkdownEditorBinding` returned `extensionProps` as a fresh object literal each
render, and `MarkdownArticle` lists it in the dep array that builds the editor's extension list
(`MarkdownArticle.tsx:174`), so every render rebuilt the extensions and recreated the view.
**Anything a capability hook returns that a consumer puts in a dep array must have stable identity.**

## Sidebar affordances

Shared manager config lives in `tools/storybook-react/.storybook/`.

- `manager.tsx` sets `sidebar.renderLabel` to prefix a blue dot on stories tagged `play-fn`. The
  indexer applies that tag itself — **never hand-tag stories, and never bake the glyph into a story
  `name`** (the name feeds the story id).
- `main.ts` registers the shared manager config via `managerEntries`. Per-package storybooks point
  `configDir` at their own `.storybook`, so without that entry they silently ignore it — the shared
  theme was affected too.

### `parameters.options.storySort` is inert

**Verified by probe on Storybook 10.4.2.** Neither a custom comparator nor
`{ method: 'alphabetical' }` reorders the sidebar, in the shared preview or a package's own
`preview.mts` — the comparator is never called.

Sidebar order follows **declaration order in the file**, which is why play stories are declared last.
Do not add a `storySort` comparator expecting it to take effect; the docs-first branch already in
`tools/storybook-react/.storybook/preview.ts:70` is dead code for the same reason. Worth a separate
look.

## Checklist

- Port 9009 untouched; free port confirmed with `lsof`; served from the worktree under test.
- Story id read from `index.json`, not guessed; dev server restarted after any file move.
- Every story smoke-loaded before it reaches the user.
- Walkthrough: one story at a time, a baseline story included, failures logged not fixed.
- Play stories carry a `Test` suffix and no manual `Test:` JSDoc, and are declared last.
- Test-plan rows describe user-visible outcomes, name which have no automated backing, and state why
  each `['!test']` story is excluded.
- Component's first story (decorators, translations) → [[composer-ui]]; full-app Playwright specs →
  [[browser-e2e-tests]].
