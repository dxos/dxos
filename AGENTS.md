# Agent Guidelines for DXOS

This file is the shared, harness-agnostic entrypoint for coding agents.

- `CLAUDE.md` and `GEMINI.md` are symlinks to it.
- Keep it thin and durable — deep how-to lives in `.agents/skills/*`;
- environment setup lives in `REPOSITORY_GUIDE.md`.

## Start of session

- On the Claude harness, a global `SessionStart` hook injects a `SESSION CONTEXT`
  block (cwd, toplevel, branch, verdict) — trust it and follow its directive. If
  no such block is present (other harnesses), run this before any file op:
  ```
  git rev-parse --show-toplevel && git branch --show-current
  ```
- **The branch, not the directory, decides whether editing is safe:**
  - Non-`main` branch (normally `claude/…`) → proceed — even if the toplevel is
    the primary checkout instead of the assigned worktree (a known harness
    mis-instantiation; say so once — it affects only Desktop UI pairing, never
    data safety). Never run `git worktree add` to "fix" it.
  - `main` → STOP, write nothing, tell the user. Never create a worktree or
    branch to escape — the harness owns those.
- **Cloud sandbox sessions differ.** If `CLAUDE_CODE_REMOTE` is set you are in the Claude Code
  cloud sandbox. `.claude/settings.json` hooks fire there as they do locally, so `/mode` and the
  branch/worktree guards behave normally. What is missing is everything outside the clone:
  `~/.claude` starts empty, so `/dxos:project` answers `Unknown command` until
  `.claude/scripts/bootstrap-plugins.sh` installs the plugin, and `gh` is absent (use the
  `mcp__github__*` tools). `moon`, `oxfmt`, and `node_modules` exist only where the environment
  ran `.config/claude-code-setup.sh` — establish which case you are in before running a build.
  The container is ephemeral, so push before you stop. Full details, including how to reach HTTPS
  from Chromium → `cloud-sandbox` skill.
- First reply: confirm these instructions and follow the reporting rule below.
- If unsure how to implement something, ask rather than guess.

## Responding to the user

These govern the **shape of every reply**, not the work. They are canonical
here, and on the Claude harness `.claude/hooks/mode.sh` re-injects them on every
prompt — a rule stated only in an always-loaded file is diluted to nothing once
a large skill loads mid-session (see `.claude/README.md` §A).

- **Open the session with the worktree and the files you read.** One line naming
  the worktree directory you are in and the instruction/skill files in play.
  **First reply only** — repeating it every turn is noise, and the `SessionStart`
  hook already delivers the branch and toplevel deterministically.
- **Number every question and every set of options.** Never an unnumbered
  a-or-b, never a bare open question.
- **Lead with the answer.** No preamble, no restatement of the request, no
  narration of what you are about to do.
- **Verbosity is a mode.** `terse` answers in 1–2 sentences, with follow-ups as a
  short flat numbered list; `normal` (the default) sets no budget but keeps
  length proportionate — length is earned by content, never by restating. Set it
  with `/mode terse` / `/mode normal`.
- These govern form only. They never override correctness, required safety
  steps, showing test/command output, or reporting a failure honestly.

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
  this session's worktree and branch at startup and owns the pairing between
  them; the branch is named after the originating prompt, not the worktree
  directory, so the two names routinely differ and that is NOT a fault to
  "correct". Creating or renaming either breaks the harness's own record and
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
- **Never change or remove a copyright notice.** A contributor's copyright line
  stays exactly as written. The only permitted edit — when the lint header rule
  demands it — is ADDING a `Copyright <year> DXOS.org` line alongside the
  author's, never replacing it. Anything beyond that requires explicit
  direction from the user.
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
- Unused deps & dead files: `pnpm knip` (root deps are excluded — see `REPOSITORY_GUIDE.md`)
- Storybook: `moon run storybook-react:serve` (port 9009)

A remote-cache warning from moon is harmless — builds work, they just don't share the team's
cache. Worth fixing anyway: `tools/moon-cache/install-certs.sh --op` installs the certificates
once per machine, for every worktree.

## Code style

Universal rules. Deeper conventions live in skills — see the pointers below.

- TypeScript, single quotes. Prefer functional style and arrow functions.
- **Prefer Effect over async/Promise.** Raw Promises belong only at platform boundaries —
  dynamic `import()` and browser callback APIs (wrap the latter with `Effect.async`). Use
  `Effect.sleep`/`Effect.gen` instead of `setTimeout`/`async` orchestration. (Exception:
  tests that need real macrotask turns across runtimes — TestClock virtualizes `Effect.sleep`.)
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

## Handing an agent a credential

Put it in **`.secrets/`** at the repo root — never in the chat. Pasting a token into a
prompt writes it to the transcript permanently; a file can be deleted.

- `.secrets/` is gitignored at every depth. That is default exclusion, not enforcement — `git add -f`
  would still stage a file, so treat "nothing under `.secrets/` is tracked" as an invariant to uphold
  rather than a guarantee git gives you. Verify with `git ls-files | grep -i secret`; the only
  expected hits are `scripts/secrets.mjs` and its edge-compute twin, which are tooling, not
  credentials.
- **The user creates the file** (agents cannot sign in or complete an OAuth consent) and
  names the path in chat. One file per credential, `chmod 600`, `key=value` lines.
- **The agent deletes it** when the task that needed it is done, and revokes the grant if
  the credential was minted for that task alone.
- Prefer a credential that can be renewed over one that expires mid-task: an OAuth access
  token lasts an hour, so a long task needs the refresh token **plus** the `client_id` and
  `client_secret` it was minted under — a refresh token alone cannot be exchanged.
- Never echo a credential's value back into chat, a log, a commit message, or an error
  report. Read it, use it, delete it.

Example (Gmail, for the live tag-sync test — see `packages/plugins/plugin-inbox/docs/TAG-SYNC.md`):

Create the file in an editor, not a shell command — an interactive shell records a heredoc's
contents in its history, and a file written before `chmod` is briefly world-readable under the
default umask:

```bash
umask 077
mkdir -p .secrets
${EDITOR:-vi} .secrets/gmail.env   # add client_id / client_secret / refresh_token here
```

Do not paste real credential values into any shell command, and do not paste them into chat.

## Where things live

- **Cloud sandbox / Claude Code on the web** — hooks that don't run, missing tooling, and the
  HTTPS egress proxy → `cloud-sandbox` skill (`.agents/skills/cloud-sandbox/SKILL.md`).
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
- **SQLite schema changes** — adding a migration, creating a new SQLite-backed
  store, or anything under `src/migrations/` →
  [`.agents/projects/sql-migrations/DESIGN.md`](.agents/projects/sql-migrations/DESIGN.md).
  Read it before reaching for Prisma: there is no driver adapter for the
  browser client, which is why the schema is hand-written SQL.
- **`REPOSITORY_GUIDE.md`** — toolchain setup, prerequisites, and how to run
  apps/services (Composer, Tasks, Docs).
- **`OPS_GUIDE.md`** / **`TROUBLESHOOTING.md`** — operations and common issues.
- **`.claude/CLAUDE.md`** — Claude-harness-specific notes.
- **DXOS runtime APIs** — see the `echo`, `effect`, and `operations` skills.
