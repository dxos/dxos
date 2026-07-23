# Agent Guidelines for DXOS

This file is the shared, harness-agnostic entrypoint for coding agents.

- `CLAUDE.md` and `GEMINI.md` are symlinks to it.
- Keep it thin and durable — deep how-to lives in `.agents/skills/*`;
- environment setup lives in `REPOSITORY_GUIDE.md`.

## Start of session

- **MANDATORY FIRST ACTION — check the branch before any file op. The branch, not
  the directory, decides whether editing is safe.** The harness assigns this
  session a branch and a worktree, but ~10% of the time it mis-instantiates them:
  the assigned `claude/…` branch gets checked out at the _primary checkout_ while
  the worktree path is left an empty `.claude`/`.moon` stub. Editing at the primary
  checkout is still safe **as long as HEAD is your assigned branch** — your commits
  land there, not on `main`. The bare-root path does NOT by itself mean `main`.
  Before reading, editing, or running anything, run:
  ```
  git rev-parse --show-toplevel && git branch --show-current
  ```
  - **On a `claude/…` (or any non-`main`) branch → proceed.** Edits are data-safe
    even if `--show-toplevel` is the primary checkout instead of
    `.../.claude/worktrees/<name>`. If the path is not the assigned worktree, say
    so once: that only affects whether the Desktop UI tracks the session
    (recoverable), not data safety. Do NOT run `git worktree add <path> <branch>`
    to "fix" it — the branch is already checked out, so that command fails (and the
    `git worktree add` guard denies it anyway). If UI pairing matters, ask the user
    to work-in-place or restart the session; do not halt the task over it.
  - **On `main` → STOP, write nothing, tell the user.** Only here do edits pollute
    the shared branch irreversibly. Do not create a worktree or branch to escape
    (the harness owns those) — ask the user how to proceed.
- Confirm you understand these instructions and list the guidance files you are
  aware of (this file, `.claude/CLAUDE.md`, relevant `.agents/skills/*`).
- State the branch and the `--show-toplevel` path you are operating on.
- When asking a question, make it yes/no or give numbered options — never an
  unnumbered a-or-b.
- If unsure how to implement something, ask rather than guess.

## Working with the user

Treat the user as an expensive, intermittent resource — minimize round-trips.

- **Front-load dependencies.** At task start, identify everything you'll need
  from the user (credentials, assets, design decisions, manual verification) and
  gather/scaffold everything obtainable on your own first.
- **Ask in one batch.** Request all human inputs together, alongside a concise
  plan, and get a single go-ahead. Then run the rest uninterrupted.
- **Don't stall on one blocker.** If an unforeseen dependency appears mid-task,
  park it, continue all other reachable work, and surface it at the next
  checkpoint — interrupt immediately only when fully blocked.
- **Automate the user's role where you can.** If their step is mechanical
  (running a command, checking output), do it yourself rather than asking.
- **Name.** When the user's name is known, refer to them by it in commentary;
  otherwise use a neutral form of address.

## Non-negotiables

- **Never create, rename, or switch worktrees or branches.** The harness assigns
  this session's worktree and branch at startup; the Desktop UI pairs them by the
  convention `branch == claude/<worktree-dir-name>`. Breaking that convention
  makes your work invisible in the UI. Therefore:
  - Do NOT run `git worktree add`, `git checkout -b`/`-B`, `git switch -c`/`-C`,
    or `git branch -m`/`-M` (the `guard-branch.sh` hook denies these).
  - Do NOT create a new branch or a side worktree, even if a skill or tool
    suggests it. This overrides `superpowers:using-git-worktrees` and the
    `EnterWorktree`/`ExitWorktree` tools — the workspace already exists.
  - Work only in the assigned directory; if you need a different branch, ask the
    user rather than switching.
- **Test after every step.** Never claim work is done without running the
  relevant build/test/lint and showing the result.
- **No casts to silence the type-checker.** `as any`, `as unknown as T`,
  widened `any` signatures, and non-null `!` are not fixes — fix the type at its
  source. `as const` is fine. See the `code-style` skill for the full rule and
  the pre-commit audit command.
- **Never suppress unhandled errors to go green.** Do not set
  `dangerouslyIgnoreUnhandledErrors` in any vitest config, and do not swallow
  unhandled rejections — surface them and fix the root cause (a suppressed
  teardown race hides real failures). Tolerate a specific known signature only
  via a narrowly-scoped `onUnhandledError`, never a blanket ignore. Full rule →
  `code-style` skill.
- **New packages are private.** Every new package MUST set `"private": true` in
  `package.json`; it is removed manually only after a trusted publisher exists.
- **Workspace deps use `workspace:*`.** Any in-repo `@dxos` package is added with
  `workspace:*`, never from the catalog. The catalog is for external packages
  only. Add deps with `pnpm add --filter "<project>" --save-catalog "<package>"`.
  **`peerDependencies` use `workspace:^`** (caret, not `*`) — a `*` pin reads as
  out-of-range on any bump and would cascade the fixed publish group to a
  spurious major. Do not "simplify" it to `*`. Why it matters:
  `.github/RELEASE-SPEC.md`.
- **Never edit while on the `main` branch.** The safety signal is the branch, not
  the directory: run `git branch --show-current` before your first edit. If it is
  `main`, stop — edits pollute the shared branch. Editing the primary checkout
  directory is fine when HEAD is your assigned `claude/…` branch (the ~10%
  mis-instantiation case in Start-of-session); the bare-root path does **not**
  imply `main`. `guard-worktree.sh` fences edits whose target working tree is on
  `main`, but treat it as a backstop, not a guarantee — self-verify the branch.
- **Commit nothing silently.** Before any commit/push, `git status` and account
  for every modified/untracked file — including the user's own edits in the
  shared worktree. Commit them or explicitly confirm exclusion.
- **Format before every commit and PR.** Run `pnpm format` (oxfmt) and stage the
  result before committing — do NOT rely on formatting files one at a time as you
  edit. CI's `check` job runs `oxfmt --check` and a **single** unformatted file
  fails the entire workflow (build/test/storybook included via the shared graph),
  wasting a full CI cycle. Never push a branch you have not formatted.

## Build, test, lint

Tasks run through `moon` (`moon run <package>:<task>`). See a package's
`moon.yml` for its available tasks.

- Build all: `moon exec --on-failure continue --quiet :build`
- Build one: `moon run <package>:build`
- Test one file: `moon run <package>:test -- path/to/file.test.ts`
- Test all: `MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism`
- Lint & fix: `moon run :lint -- --fix`
- Format: `pnpm format` (oxfmt — CI checks `oxfmt --check`, not prettier)
- Storybook: `moon run storybook-react:serve` (port 9009)

Ignore the `Auth token DEPOT_TOKEN does not exist` warning (remote-cache auth).

## Code style

Universal rules. Deeper conventions live in skills — see the pointers below.

- TypeScript, single quotes. Prefer functional style and arrow functions.
- Import order, blank line between groups:
  builtin → external → @dxos → internal → parent → sibling.
- Prefer named exports; avoid default exports. Use barrel imports.
- **Never leave compatibility re-exports or shims when moving code.** Update
  every call site to the new location in the same change.
- Comments state _why_ the code is necessary (the constraint it satisfies) in
  **one load-bearing clause** — not a multi-sentence essay — end with a period,
  and never narrate history or this conversation. Delete a comment the code
  already makes obvious. Audit added comments in your diff before every commit,
  same as casts. JSDoc public functions. Full rule → `code-style` skill.
- Prefer ES `#private` over the TypeScript `private` keyword in new code
  (`_private` is fine to keep).
- No single-letter variable names. Remove/update TODOs as you touch them.
- React: arrow-function components, TailwindCSS, named React imports (`useMemo`,
  `type Ref` — not `React.useMemo`); name the ref `forwardedRef`.

Deeper conventions:

- No-cast rule, comment rule (say why, once), namespace-export packages,
  internal-module imports, class-member ordering, options-bag types, overload
  syntax, and test structure → `code-style` skill.
- ECHO objects, queries, schema, Ref/DXN → `echo` skill.
- Effect-TS services, layers, and typed domain errors → `effect` skill.
- React components, theme tokens, and Composer UI primitives → `composer-ui`
  skill.
- Do not use deprecated functions if an alternative is available.

## Git & PR workflow

- **Commit messages and PR titles: `scope: description`.** Scope is the
  package or area most affected (e.g. `echo`, `plugin-markdown`, `release`);
  description is a concise, imperative summary.
- **CI is one workflow, "Check"** — build, test, lint, fmt. A red Check is your
  failure, not pre-existing; fix the root cause on the branch, never merge
  around it. Inspect: `gh run list --branch <branch> --workflow "Check"`, then
  `gh run view <id> --log-failed`.
- Commit hygiene → see "Commit nothing silently" in Non-negotiables.
- Creating or landing a PR is a procedure — use the `submit-pr` and `land`
  skills. Always surface the Composer preview URL next to the PR link.
- Consumer-relevant changes need a `.changeset/*.md` before opening the PR —
  see [`agents/instructions/changesets.md`](agents/instructions/changesets.md)
  for when to add one, which package to name, and bump levels.

## Where things live

- **`.agents/` vs `agents/`** — `.agents/` (dot) holds agent **control state**
  (skills, the project registry); `agents/` (no dot) holds **user-visible
  artifacts** (instructions, prompts, superpowers specs/plans/handoffs).
- **Superpowers artifacts** — brainstorming specs, writing-plans plans, and
  handoffs live in **`agents/superpowers/{specs,plans,handoffs}/`**, NEVER
  `docs/superpowers/`. This **overrides the superpowers plugin's default path**:
  whenever a superpowers skill says to write to or read from `docs/superpowers/…`,
  use `agents/superpowers/…` instead.
- **Skills** (`.agents/skills/*`) — deep, task-specific how-to. Follow the
  relevant skill for the area you're working in (echo, effect, composer-ui,
  operations, testing, code-style, submit-pr, land, …).
- **Flaky test quarantining** — investigating a flaky/red CI run or setting up
  Trunk test uploads → `trunk-quarantine` skill
  (`.agents/skills/trunk-quarantine/SKILL.md`); adding the Trunk MCP server →
  `REPOSITORY_GUIDE.md`.
- **`REPOSITORY_GUIDE.md`** — toolchain setup, prerequisites, and how to run
  apps/services (Composer, Tasks, Docs).
- **`OPS_GUIDE.md`** / **`TROUBLESHOOTING.md`** — operations and common issues.
- **`.claude/CLAUDE.md`** — Claude-harness-specific notes.
- **DXOS runtime APIs** — see the `echo`, `effect`, and `operations` skills.
