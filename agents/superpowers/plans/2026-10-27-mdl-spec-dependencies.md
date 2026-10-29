# MDL spec dependencies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Specs declare what they build on (`uses` blocks, plugin `dependsOn`), reference other specs as `<spec id>#<item>`, and `deus lint` and the plugin-code spec viewer check and resolve those references.

**Architecture:** `@dxos/deus` gains a spec index (id → path + item ids, built from the checkout), a parser for dependencies and references, and two lint sources (`mdl/ref`, `mdl/uses`) in `src/extension/check.ts`. `deus index` writes the index as JSON; plugin-code generates it in a prebuild task and bundles it, so the viewer resolves an id to a `github:` key and opens the spec at the item. A migration converts every `github:…/*.mdl` key in spec bodies.

**Tech Stack:** TypeScript, Effect CLI (`effect/cli`), CodeMirror 6 (`@codemirror/lint`, `@codemirror/view`), vitest, moon.

**Spec:** `agents/superpowers/specs/2026-10-27-mdl-spec-dependencies-design.md`

## Global Constraints

- Not frontmatter. `extends:` is unchanged.
- References are `<spec id>#<item>` only; a bare `[F-9.2]` / `type:View` always means this spec's own item. No paths, no versions, no transitive references.
- `dependsOn` is exactly `dx.config.ts`'s `plugin.dependsOn`; an id in `dependsOn` is never repeated under `uses`.
- Every lint diagnostic in the design table is severity `error`.
- Dependency cycles are allowed.
- The index covers this repository only; it excludes `*.review.mdl` and `__fixtures__`, and includes `packages/reflect/deus/lang/*.mdl`.
- Text in any non-`mdl` code fence is not scanned for references.
- Review files keep `github:` keys; `mdl/ref` does not run on `*.review.mdl`.
- Each changed spec gets a `## Changelog` decision (mdl skill); `pnpm deus changelog check` stays green.
- Run deus commands with Node 24: `export PATH="$HOME/.proto/shims:$HOME/.proto/tools/node/24.11.1/bin:$PATH"`.
- `pnpm format` before every commit.

## Review Focus

1. **A `github:` key or URL that looks like a reference** (`lang/review.mdl#X`, `https://dxos.org#top`): not matched as `<id>#<item>`. Test in Task 2.
2. **A reference inside an ASCII diagram or `ts` fence** (plugin-code PLUGIN.mdl line 178): ignored. Test in Task 2.
3. **The editor with no index** (Storybook, a spec opened outside the repo): `mdl/ref` and `mdl/uses` emit nothing rather than flagging every reference. Test in Task 3.
4. **Two files with one id** (`plugin-spacetime`): reported on both, and resolution of that id is not silently first-wins. Test in Task 1.
5. **A reference whose spec exists but whose item was renamed**: an `mdl/ref` error naming the item, and a broken link in the viewer. Tests in Task 3 and Task 5.

---

### Task 1: Spec index

**Files:**

- Create: `packages/reflect/deus/src/index/spec-index.ts`, `packages/reflect/deus/src/index/index.ts`
- Create: `packages/reflect/deus/src/cli/spec-index.ts` (the `deus index` command)
- Modify: `packages/reflect/deus/src/cli/index.ts` (register `index`), `packages/reflect/deus/src/index.ts` (export), `packages/reflect/deus/package.json` (`./spec-index` subpath, same shape as `./extension`)
- Test: `packages/reflect/deus/src/index/spec-index.test.ts`, fixtures under `packages/reflect/deus/src/cli/__fixtures__/index/`

**Interfaces:**

- Produces:
  - `type SpecEntry = { path: string; items: string[] }` — `path` POSIX, repo-relative; `items` every block id and `req` id (reuse `parseMdlBlocks` and the `req` parsing in `cli/review.ts` `reviewItems`).
  - `type SpecIndex = { specs: Record<string, SpecEntry>; duplicates: Record<string, string[]> }` — a duplicated id is absent from `specs` and listed with every path in `duplicates`.
  - `indexSpecs(files: { path: string; text: string }[]): SpecIndex` — pure.
  - `buildSpecIndex(root: string): Effect<SpecIndex, PlatformError, FileSystem>` — `git ls-files '*.mdl'` under `root` (reuse `cli/git.ts`), minus `*.review.mdl` and any path containing `__fixtures__`.
  - CLI: `deus index [--out <file>]` prints or writes `JSON.stringify(index, null, 2)`.

- [ ] **Step 1: Failing tests** in `spec-index.test.ts`:
  - `indexes a spec by its frontmatter id with its block and req ids` — a fixture with `id: org.example.a`, `type Foo` and `feat F-1` with `req F-1.1` → `specs['org.example.a'].items` contains `Foo`, `F-1`, `F-1.1`.
  - `reports a duplicated id on every path and does not resolve it` — two files, one id → `specs` lacks it, `duplicates[id]` has both paths.
  - `skips a file with no frontmatter id`.
- [ ] **Step 2:** `moon run deus:test -- src/index/spec-index.test.ts` → FAIL (module not found).
- [ ] **Step 3:** Implement `indexSpecs`, `buildSpecIndex` and the `index` command.
- [ ] **Step 4:** Tests PASS; `pnpm deus index | head` from the repo root lists `org.dxos.ui.react-ui-canvas` and `org.dxos.spec.review`, and `duplicates` names plugin-spacetime.
- [ ] **Step 5: Commit** `deus: spec index of every .mdl spec by id`.

### Task 2: `uses`, `dependsOn` and reference parsing

**Files:**

- Create: `packages/reflect/deus/src/extension/refs.ts`
- Modify: `packages/reflect/deus/src/extension/constants.ts` (add `'uses'` to `BLOCK_TYPES`), `packages/reflect/deus/lang/core.mdl` (an `ext uses` under a new `## Dependencies Section`, after `## Extensions Section`), `packages/reflect/deus/lang/plugin.mdl` (`version: 1.1`, `dependsOn?: URI[]` field, a Model bullet, `org.dxos.mdl.plugin@1.1`), `packages/reflect/deus/src/extension/fences.ts` only if `uses` needs a highlight entry
- Test: `packages/reflect/deus/src/extension/refs.test.ts`

**Interfaces:**

- Consumes: `parseMdlBlocks` (check.ts).
- Produces:
  - `type SpecRef = { id: string; item: string; from: number; to: number }`
  - `findSpecRefs(text: string): SpecRef[]` — scans prose and `mdl` fences (comments included), skips every other fence. Pattern: `(?<![\w/:.#-])([a-z][a-z0-9-]*(?:\.[a-z0-9-]+)+)#([\w$.-]*\w)`. Trailing sentence `.` is excluded by the final `\w`.
  - `type Dependency = { id: string; via: 'uses' | 'dependsOn'; from: number; to: number }`
  - `specDependencies(text: string): Dependency[]` — `uses` block ids plus `dependsOn: [...]` entries of the `plugin` block; offsets point at the id text.
  - `ext uses` fields: identifier is a spec id (URI), the inline prose is required. Syntax example as in the design.

- [ ] **Step 1: Failing tests** in `refs.test.ts`:
  - `finds a reference in prose and in an mdl block` → `org.dxos.ui.react-ui-canvas#F-9.2` returns `{ id: 'org.dxos.ui.react-ui-canvas', item: 'F-9.2' }`.
  - `excludes trailing sentence punctuation` — `see org.a.b#Foo.` → item `Foo`.
  - `ignores github keys and URLs` — `github:dxos/dxos/lang/review.mdl#X` and `https://dxos.org#top` → `[]`.
  - `ignores references in non-mdl fences` — inside ` ```ts ` and a bare ` ``` ` fence → `[]`.
  - `reads uses blocks and the plugin block's dependsOn` → two deps with `via` `uses` and `dependsOn`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement; edit the two dialect files.
- [ ] **Step 4:** Tests PASS; `moon run deus:test` all green.
- [ ] **Step 5: Commit** `deus: uses block, plugin dependsOn and spec references`.

### Task 3: Lint `mdl/ref` and `mdl/uses`

**Files:**

- Modify: `packages/reflect/deus/src/extension/check.ts` (`lintMdl`), `packages/reflect/deus/src/extension/lint.ts` (`mdlLint` takes an index), `packages/reflect/deus/src/cli/lint.ts` (build the index once, skip `mdl/ref` for `*.review.mdl`)
- Test: `packages/reflect/deus/src/extension/check.test.ts`, `packages/reflect/deus/src/cli/cli.test.ts`

**Interfaces:**

- Consumes: `SpecIndex` (Task 1), `findSpecRefs`, `specDependencies` (Task 2).
- Produces:
  - `lintMdl(text: string, options?: { index?: SpecIndex; selfId?: string }): Diagnostic[]` — with no `index`, no `mdl/ref` / `mdl/uses` diagnostics. `selfId` defaults to the frontmatter `id`.
  - `mdlLint(index?: SpecIndex | (() => SpecIndex | undefined)): Extension` — callers in plugin-code update to `mdlLint(…)`.
  - Exact messages (tests assert them):
    - `mdl/ref`: ``Unknown spec `<id>`.`` · `` `<id>` has no item `<item>`. `` · `` `<id>` is not a dependency; add `uses <id>: …` under ## Dependencies. `` · ``Refer to a spec by id (`<id>#<item>`), not by a github: key.`` · ``Spec id `<id>` is declared by more than one file.``
    - `mdl/uses`: ``Unknown spec `<id>`.`` · `` `<id>` is declared twice. `` · `A spec cannot use itself.` · `` `<id>` is in dependsOn; do not repeat it under uses. ``
  - A `github:` key is rejected when its path ends in `.mdl` (fragment or not). A reference to `selfId` is always allowed.

- [ ] **Step 1: Failing tests** in `check.test.ts`, each with an in-memory index of two specs:
  - one per message above (11 cases), asserting `source` and `message`;
  - `emits no ref or uses diagnostics without an index` (Review Focus 3);
  - `an id in dependsOn admits references to it` and `a cycle is allowed` (A uses B, B uses A → no diagnostics).
  - In `cli.test.ts`: `lint skips mdl/ref in review files`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Tests PASS. Then `pnpm deus lint --only mdl/ref $(git ls-files '*.mdl' | grep -v review.mdl)` from the repo root: the expected failures are the migration set (Task 6); save the list.
- [ ] **Step 5: Commit** `deus: lint spec references and dependencies`.

### Task 4: Review check of `dependsOn`

**Files:**

- Modify: `packages/reflect/deus/src/cli/review.ts` (`checkReview`), `.claude/skills/spec-review/SKILL.md` (one step: judge the `plugin` block's `dependsOn` against `dx.config.ts`; a mismatch is `diverged`)
- Test: `packages/reflect/deus/src/cli/cli.test.ts`, fixture `src/cli/__fixtures__/review/plugin-deps/{PLUGIN.mdl,PLUGIN.review.mdl,dx.config.ts}`

**Interfaces:**

- Produces: `configDependsOn(configText: string): string[] | undefined` — the string array literal after `dependsOn:` in `dx.config.ts`; undefined when absent.
- `checkReview` errors when the spec's `plugin` block `dependsOn` differs (as a set) from `configDependsOn` of `dx.config.ts` beside the spec and the plugin block's verdict is not `diverged`. Message: `<at>: <Plugin> dependsOn [<spec>] differs from dx.config.ts [<config>]; judge it diverged`.

- [ ] **Step 1: Failing tests:** `configDependsOn parses the array`; `review check fails on a dependsOn mismatch judged done`; `review check passes when the mismatch is judged diverged`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement; edit the skill.
- [ ] **Step 4:** Tests PASS; `pnpm deus review check packages/plugins/plugin-code/PLUGIN.review.mdl` unchanged in result.
- [ ] **Step 5: Commit** `deus: review checks a plugin's dependsOn against dx.config.ts`.

### Task 5: Viewer — bundled index, links, open at item

**Files:**

- Modify: `packages/plugins/plugin-code/moon.yml` (task `prebuild-spec-index`: `pnpm --filter @dxos/deus exec node --conditions=source bin/deus.ts index --out $projectRoot/src/sync/gen/spec-index.json`, `tags: [prebuild]`, `inputs: ['/**/*.mdl']`, `outputs: [src/sync/gen/spec-index.json]`; `build` deps `~:#prebuild` as in deus's moon.yml), `.gitignore` (`packages/plugins/plugin-code/src/sync/gen/`)
- Create: `packages/plugins/plugin-code/src/sync/spec-ref.ts`
- Modify: `packages/plugins/plugin-code/src/sync/index.ts` (export), `packages/plugins/plugin-code/src/components/SpecEditor/source-links.ts`, `packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx` (open + pending reveal; pass the index to `mdlLint` wherever `mdl()` wires it)
- Test: `packages/plugins/plugin-code/src/sync/spec-ref.test.ts`, a `SpecEditor` story `References` with one resolvable and one broken reference

**Interfaces:**

- Consumes: `SpecIndex`, `findSpecRefs`, `specDependencies` from `@dxos/deus` (add the subpaths to plugin-code imports), `SourceKey`, `formatSourceKey`.
- Produces:
  - `SPEC_INDEX: SpecIndex` — `import` of `./gen/spec-index.json`.
  - `resolveSpecRef(index: SpecIndex, id: string, item?: string): SourceKey | { error: string }` — `{ owner: 'dxos', repo: 'dxos', path, fragment: item }`; error strings are the `mdl/ref` messages of Task 3.
  - `sourceLinks(onOpen, index?: SpecIndex)` — also decorates `findSpecRefs` matches and `specDependencies` ids; a broken one gets class `line-through decoration-error-text` and `title` = the error.
  - `pendingReveal: Atom.Writable<{ path: string; item: string } | undefined>` (plugin-code state). `open` sets it before `LayoutOperation.Open` of another spec; `SpecArticle` on mount, when its key's path matches, calls `reveal(item)` and clears it. `LayoutOperation.ScrollIntoView` is not used: its `cursor` is not handled by spec articles.

- [ ] **Step 1: Failing tests** in `spec-ref.test.ts`: `resolves an id to a github key with the item as fragment`; `a bare id resolves to the spec with no fragment`; `an unknown item is an error naming it` (Review Focus 5); `a duplicated id is an error`.
- [ ] **Step 2:** `moon run plugin-code:test -- src/sync/spec-ref.test.ts` → FAIL.
- [ ] **Step 3:** Implement `spec-ref.ts`, the moon task and `.gitignore`; then the `sourceLinks` and `SpecArticle` changes.
- [ ] **Step 4:** Tests PASS; `npx tsc --noEmit -p packages/plugins/plugin-code/tsconfig.json` clean. In Storybook (9009, this worktree) the `References` story underlines both references, the broken one struck through with the message on hover; ⌘-click on the good one opens it.
- [ ] **Step 5: Commit** `plugin-code: resolve spec references through a bundled spec index`.

### Task 6: Migration

**Files:**

- Modify: `packages/plugins/plugin-code/PLUGIN.mdl` (the 8 `github:…/*.mdl` keys → `<id>#<Item>`; `uses` / `dependsOn` for each; the line-178 diagram stays), `packages/plugins/plugin-canvas/PLUGIN.mdl` (replace the prose list with `## Dependencies` holding `uses org.dxos.ui.react-ui-canvas: …`, add a `plugin CanvasPlugin` block with `dependsOn: [org.dxos.plugin.illustrator]`, declare `uses` and `plugin@1.1` in Extensions), every other spec on the Task 3 list, `packages/reflect/deus/SPEC.mdl` (decisions), `.claude/skills/mdl/SKILL.md` (rule 5: `<id>#<item>` and `## Dependencies`)
- Test: lint over the repo

- [ ] **Step 1:** For each spec on the Task 3 list, convert keys and add declarations. Add per spec a `user:richburdon` decision restating the user's call (references by id, dependencies declared) and, where the agent chose the reason text or the block, an `agent:claude-code` decision with `for: user:richburdon`.
- [ ] **Step 1b:** Resolve the plugin-spacetime duplicate id: compare `PLUGIN.mdl` and `docs/PLUGIN.mdl`, give the secondary document its own id (`org.dxos.plugin.spacetime.<topic>`) with a decision; if one is a stale copy, report it to the user instead of deleting it.
- [ ] **Step 2:** deus `SPEC.mdl`: append `user:richburdon` decisions for the user's calls in the design (not frontmatter; core `uses` + plugin `dependsOn`; no duplication; `<id>#<item>`; lint errors; viewer opens at item; github .mdl keys rejected; dependsOn = dx.config runtime deps; build-time bundled index, dxos only), then one `agent:claude-code` decision per _(agent's call)_ item, and an approval entry `Approve [D-…]` by `user:richburdon` (the user approved the design on 2026-10-27).
- [ ] **Step 3:** Run, from the repo root:
  - `pnpm deus lint $(git ls-files '*.mdl' | grep -v '\.review\.mdl$' | grep -v __fixtures__)` → no `mdl/ref` or `mdl/uses` errors.
  - `pnpm deus changelog check` → pass.
  - `pnpm deus lint --only mdl/decision <changed specs>` → pass.
  - `node .agents/skills/mdl/scripts/check-decisions.ts` → pass or skip notice.
- [ ] **Step 4:** `pnpm format`; commit `specs: refer to other specs by id and declare dependencies`.
