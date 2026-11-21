# Instructions: storybook + test-plan skill

Addendum to the task "Write storybook testing/debugging skill" (spawned 2026-07-24 from
`claude/markdown-selection-assistant-visibility-833995`). Everything below was learned **after** that
task was spawned, during the plugin-review review walkthrough and the S6.1 root-cause hunt. Fold it
into the skill; where it contradicts the spawn prompt, this file wins.

Split the material into **two** skills if it reads better that way: one for driving storybook
(serving, verifying, debugging) and one for authoring test plans. Do not duplicate the code-style or
composer-ui skills — link to them.

## 1. Story authoring conventions (settled, with rationale)

- **One `DefaultStory` on `meta.render`; variation via `args` only.** No per-story `render:` overrides —
  they duplicate setup and drift. Setup a tester depends on (seeded branches, comments, second
  documents) belongs in `args` consumed by the decorator **before mount**.
- **A story with a `play` must not carry a manual test script.** Opening it runs the script and leaves
  the UI past the state the script describes. This was a real defect in our stories, caught by the user.
- **Naming on collision:** the automated story takes a `Test` suffix (`SuggestingTest`) and the plain
  name belongs to the hands-on story (`Suggesting`). Do **not** try a `_` prefix — Storybook strips a
  leading underscore from both the id and the display name, so `_Suggesting` and `Suggesting` collide.
  Verified by probe.
- **Declare play stories last in the file.** Sidebar order follows declaration order because
  `parameters.options.storySort` is **inert** in this setup (Storybook 10.4.2): neither a custom
  comparator nor `{ method: 'alphabetical' }` reorders anything, in the shared preview or a package's
  own `preview.mts`, and the comparator is never called. The pre-existing docs-first branch in
  `tools/storybook-react/.storybook/preview.ts` is therefore dead code — worth a separate look.
- **Manual scripts are numbered steps** in the story's JSDoc `Test:` block, so failures are reported as
  "S1.3" and land in a tracker unambiguously.
- Sidebar marks play stories with a blue dot via `sidebar.renderLabel` in
  `tools/storybook-react/.storybook/manager.tsx`, keyed off the indexer's own `play-fn` tag. Never
  hand-tag stories and never bake the glyph into a story `name`. The shared manager config reaches
  package storybooks only because `main.ts` registers it via `managerEntries` — per-package configs
  point `configDir` at their own `.storybook` and would otherwise silently ignore it (the theme was
  affected too).

## 2. Running the walkthrough (the protocol that worked)

The agent drives, the user tests. Concretely:

1. Agent **smoke-loads each story before handing it over** and says what it verified. Non-negotiable —
   the user's words: "you should test the story starts as a first step". Full plugin-stack stories can
   take 10–20s to first paint; poll, don't screenshot immediately.
2. Agent hands over **one story at a time** with its numbered steps inline, and names what comes next.
3. Agent reports any gap it finds itself **before** the user tests (we found a story fixture that never
   fired, and told the user to skip that step rather than let them chase it).
4. User reports failures by step number. **Agent logs, agent does not fix**, until the whole
   walkthrough is done — the user asked for this explicitly and it was right: the last story
   (the no-review baseline) reframed three earlier issues as one bug.
5. Agent writes each batch into the project `TASKS.md` and commits, so nothing depends on the session
   surviving.
6. At the end the agent proposes a **triage order** with a recommendation, not a flat list.

Include a control/baseline story in every plan — the story with the feature switched off. Ours is what
localised the defect.

## 3. Test-plan authoring

- Two tables: **automated** (play-asserted, runs in `moon run <pkg>:test-storybook` + CI) and **manual**
  (judgment). Each row: story, what it asserts / what to verify.
- **Describe the outcome, not the dispatch — and cover it.** Our plan's manual row for Accept/Reject
  read "route to ops", and that was literally true while the buttons did nothing: the op fired, the
  document never changed. No automated test covered the path at all. Word each row as the user-visible
  outcome, and be honest in the plan about which rows have no automated backing.
- Stories tagged `['!test']` never run in CI; say so in the plan and state _why_ per story, or the plan
  overstates its coverage.
- Record results in the plan with dates, and keep issue ids (`S1.3`) stable once reported.

## 4. Debugging workflow (this is what found the real bug)

Worked example to include, because it generalises:

1. **Split harness from product first.** In the app, toggle the plugin off/on in the plugin registry.
   Ours: editor fine with plugin-review disabled, focus lost per keystroke once enabled → product, and
   it collapsed three reported issues into one.
2. **Reproduce headlessly** in the browser pane: click into the editor with `computer`, `type` a few
   characters, then assert `document.activeElement.closest('.cm-editor')` and that the text landed.
   Cheaper and more reliable than asking a human to re-demonstrate.
3. **Instrument with a render-diff probe** rather than guessing: keep a `useRef` of the previous values
   of every candidate, log which keys changed identity per render. Ours printed `changed: versioning`
   and _nothing else_ — which falsified the leading hypothesis (extensions/editor key churn) in one
   step.
4. **Watch for the thing you didn't probe.** The culprit was an object literal returned from the hook
   whose _fields_ were all stable — the probe compared fields, the consumer compared the object. Probe
   the identity the consumer actually depends on.
5. Remove instrumentation, apply the fix, **re-run the same headless repro** as proof, then the suite.

Root cause worth citing in the skill as the canonical shape: `useMarkdownEditorBinding` returned
`extensionProps` as a fresh object each render; `MarkdownArticle` lists it in the dep array that builds
the editor's extension list, so every render rebuilt the extensions and recreated the view. **Anything
a capability hook returns that a consumer puts in a dep array must have stable identity.**

## 5. Harness pitfalls

- **Never touch port 9009** — the user's aggregate storybook. Serve the package under test on a free
  port (we used 9014) **from the worktree**; serving from the main checkout renders main's files.
- **After moving or renaming files, restart the dev server.** Vite's module graph goes stale and throws
  "Failed to fetch dynamically imported module" against a `?t=…` URL that still serves 200; reloading
  does not clear it. This bit both the storybook and `serve-min`.
- Story ids derive from the export name and the meta `title` (a repo hook syncs `title` to the file
  path), never from a story's `name` — so renaming for display is safe, moving a file is not.
- `moon run <pkg>:test-storybook` is the battery; a story with no play still counts as a smoke test, so
  adding play-free manual stories increases real coverage.

## 6. Verify before finishing

Run `moon run plugin-review:test-storybook` (27/27 green as of this handoff) and serve the plugin-review
storybook on a free port to confirm a story renders. Add the skill to `CLAUDE.md`'s "Where things live"
list alongside its siblings.
