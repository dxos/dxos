---
name: storybook-testing
description: >-
  Running, smoke-loading, and debugging storybook stories for verification. Use when serving a
  storybook to check a UI change, resolving a story id, handing a manual test script to the user,
  structuring a `.stories.tsx` file (DefaultStory + args, play stories vs hands-on stories), or
  touching the shared storybook manager/sidebar config in `tools/storybook-react/.storybook`.
---

# Storybook testing

How to drive storybook as a verification tool. The authoring conventions for a component's first
story (decorators, `withTheme()`, `parameters: { translations }`) live in the `composer-ui` skill —
this skill covers what happens **after** the story exists: serving it, proving it loads, and shaping
the file so a human can test it.

## Serving a storybook

**Never kill or reuse port 9009.** That is the user's aggregate storybook
(`moon run storybook-react:serve`); taking it over or restarting it destroys their working state.

Serve the package under test on a free port, **from the worktree you edited**:

```bash
pnpm exec storybook dev -p 9014 --no-open
```

Run it detached with output redirected to a log file, then poll the log/port rather than blocking.
Serving from the primary checkout renders MAIN's files and silently masks worktree edits — a story
that "doesn't exist" or "didn't change" is usually this.

Before claiming a port is free, check it — a previous session may still own it:

```bash
lsof -i:9014 -sTCP:LISTEN
```

If the port is taken, `storybook dev` does not fail; it prompts interactively ("Port 9014 is not
available. Would you like to run Storybook on port 9015 instead?") and hangs forever waiting on
stdin. A detached run then looks alive but never binds. Pick a genuinely free port instead.

### Story ids

The id is `<title-slugified>--<export-name-slugified>`, e.g. a story exported as `Default` from
`title: 'plugins/plugin-review/components/CommentThread'` is
`plugins-plugin-review-components-commentthread--default`.

It derives from the meta `title` and the **export name** — a story's `name` field does not affect
it. Titles mirror the file path by convention, so the id is predictable from the path, but confirm
rather than guess:

```bash
curl -s http://localhost:9014/index.json
```

Then open `http://localhost:9014/iframe.html?id=<story-id>&viewMode=story`.

### Stale module graph after moving or renaming story files

Moving or renaming a `.stories.tsx` leaves vite's module graph stale: the browser reports
`Failed to fetch dynamically imported module` against a `?t=…` URL that still returns 200.
**Reloading does not fix it — restart the dev server.** Don't spend time debugging the import.

## Smoke-load before handing a story to a human

Always open the story yourself and assert it actually rendered **before** giving the user a test
script — e.g. wait for `.cm-content` to exist, or for a known string from the fixture. A green build
and a green typecheck say nothing about whether the story mounts.

Full plugin-stack stories can take 10–20s to first paint. Poll for the expected element rather than
screenshotting immediately; an early screenshot shows an empty frame and reads as a failure.

## Story file structure

- **One `DefaultStory`, referenced by `meta.render`.** Per-story variation comes from `args` only —
  no per-story `render:` overrides.
- **Setup a manual tester depends on belongs in `args`**, consumed by the decorator before mount —
  never in a play function. A hands-on tester never runs the play function's setup.
- **A story with a play function must not carry a manual `Test:` script in its JSDoc.** Opening it
  runs the script and leaves the UI past the state the script describes, so the steps no longer
  apply. Where both are wanted, split them: the play-driven story takes a `Test` suffix
  (`SuggestingTest`) and the plain name (`Suggesting`) belongs to the hands-on story.
- **Manual test scripts are numbered steps** (`1.` `2.` `3.`), so the user can report a failure by
  number.

## Sidebar affordances

Shared manager config lives in `tools/storybook-react/.storybook/`.

- `manager.tsx` sets `sidebar.renderLabel` to prefix a blue dot on stories tagged `play-fn`. The
  indexer applies that tag automatically — **do not hand-tag stories, and do not bake the glyph into
  a story `name`** (the name feeds the story id).
- `main.ts` registers the shared manager config via `managerEntries`. Per-package storybooks point
  `configDir` at their own `.storybook`, so without that entry they never load the shared manager
  config at all (no theme, no sidebar labels).

### `parameters.options.storySort` is inert

**Verified by probe on Storybook 10.4.2: `storySort` does not work in this setup.** Neither a custom
comparator nor `{ method: 'alphabetical' }` reorders the sidebar, whether set in the shared preview
or in a package's own `preview.mts` — the comparator is never even called.

Sidebar order follows the order stories are **declared in the file**. So "play stories last" is
achieved by declaring them last, not by configuring a sort. Do not add a `storySort` comparator
expecting it to take effect. The pre-existing docs-first branch in that comparator is dead code for
the same reason. Worth a follow-up investigation.

## Checklist

- Port 9009 untouched; serving on a free port verified with `lsof`, from the worktree under test.
- Story id read from `index.json`, not guessed.
- Story opened and asserted to render before any test script goes to the user.
- Play-driven stories carry a `Test` suffix and no manual `Test:` JSDoc; hands-on stories keep the
  plain name and numbered steps.
- Ordering handled by declaration order, not `storySort`.
- Authoring a component's first story (decorators, translations) → [[composer-ui]]; full-app
  Playwright specs → [[browser-e2e-tests]].
