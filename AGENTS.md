# Agent Guidelines for DXOS

## IMPORTANT

- When you start, the first thing you should do is tell the user if you understand these instructions and list the config files you are aware of.
- You must disclose your current worktree as soon as it is created.
- If you are unsure about the best way to implement something, ask the user for clarification.
- When asking the user a question; either make it yes/no, or provide numbered options.
- DO NOT EVER ASK a-or-b questions without numbering them.
- ALWAYS test your work after each step.

## Dependencies

- All dependency versions are managed in the default pnpm catalog.
- To add a new dependency, run `pnpm add --filter "<project>" --save-catalog "<package>"`.
- **IMPORTANT**: Any `@dxos` package that lives within this repo must be added with the `workspace:` protocol, never from the catalog. The catalog is only for external (non-workspace) packages.
  - **Regular `dependencies` / `devDependencies` → `workspace:*`.**
  - **`peerDependencies` → `workspace:^`** (caret, not `*`) — a `*` pin reads as out-of-range on any bump and would cascade the fixed group to a spurious major. Do not "simplify" it to `*`. Why it matters: `docs/design/release-spec.md`.

## Build, Test, Lint Commands

- Project uses `moon` to run tasks, tests, lint etc. (moon run package-name:task-name).
- Build all: `moon exec --on-failure continue --quiet :build`.
- Build package: `moon run package-name:build`.
- Run single test file: `moon run package-name:test -- path/to/test.test.ts`.
- Run all tests: `MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism`.
- Storybook: `moon run storybook-react:serve` (defaults to port 9009).
- Lint & fix: `moon run :lint -- --fix`.
- Check package tasks: see `moon.yml` in package directory.
- **Expected warning**: `Auth token DEPOT_TOKEN does not exist` is a normal warning about remote caching and should be ignored. Filter out warnings from your output.

## Planning

- **IMPORTANT**: Do NOT cast values to fix build issues; instead create a refactoring plan and get permission.
  - "Cast" means `as T`, `as any`, `as unknown as T`, non-null `!`, or a widened/`any` signature added to silence a type error. `as const` is NOT a cast in this sense — it narrows a literal rather than bypassing the checker, and is always acceptable (no comment or justification needed).
  - Default: fix the type at its source (inference, signature, generic), not the call site that surfaced the error. A red typecheck during a refactor is a finding, not an obstacle to paper over.
  - Casts are only acceptable at genuine type-system boundaries (external/untyped data, deliberate coercions), and must carry a concise comment saying why no typed alternative exists.
  - **Before every commit/PR**, audit your diff for new casts: `git diff origin/main | grep -nE '\bas (any|unknown|[A-Z])|as unknown as'`. Justify or remove each; do not defer to review. (`as const` is intentionally excluded from this pattern.)
  - Casts accumulate fastest during large codemods — treat each as a deliberate decision, never an autopilot stopgap.

## Knowledge

- **IMPORTANT**: Follow DXOS-specific rules in `.agents/skills/*`.
- Update these documents when you learn better patterns; or when the user asks you to correct your implementation.

## Code Style

- Follow the DXOS SDK guide.
- Use TypeScript with single quotes for strings.
- Prefer functional programming and arrow functions.
- Import order: builtin → external → @dxos → internal → parent → sibling (with blank lines between groups).
- **Internal module imports** (e.g. `@dxos/echo` entrypoints importing `src/internal/<Module>/`): import the capitalized internal barrel as a lowercase `*Internal` namespace — `import * as objInternal from './internal/Obj'`, `import * as queryInternal from './internal/Query'`. Do not deep-import submodules (`./internal/Obj/atoms`, `./internal/Ref/ref`, etc.); re-export needed symbols from the module's `index.ts` instead. The top-level `./internal` barrel is for cross-cutting re-exports only — prefer the per-module barrel when a single entrypoint owns the dependency. Atom factories inside internal modules use the `makeAtom` name (not `make`) to avoid clashing with public `make` APIs.
- Error handling: use Effect-TS patterns. Never put untyped `Error` in an Effect's error type parameter — define domain errors with `BaseError.extend` (from `@dxos/errors`) or `Data.TaggedClass` so callers can recover with `Effect.catchTag`.
- JSDoc comments for public functions, all comments end with period.
- Comments state _why the code is necessary_ (the invariant or constraint it satisfies), concise and self-contained. Never narrate the fix, reference this conversation, or use before/after framing ("rather than X we now do Y", "this used to…"). State the constraint that makes the code correct; drop the history.
- React: arrow function components, TailwindCSS for styles, proper event handler types.
- Remember to remove/update TODOs as you go.
- Avoid single letter variable names.
- Avoid default exports unless required.
- Avoid re-exports. Prefer importing symbols directly from the package that defines them.
- **IMPORTANT**: When moving code (between files, packages, or namespaces), do NOT leave compatibility re-exports or shims behind. Proactively update every call site to import from the new location in the same change. Backwards-compatibility aliases rot and hide the refactor; fix all usages up front.
- Use barrel imports whenever possible.
- Prefer ES `#private` fields/methods over TypeScript `private` keyword in new code. Existing `_private` convention is fine to keep.
- For files imported as a namespace (i.e., marked with `// @import-as-namespace`), avoid prefixing top-level types with the namespace name. Inside `Foo.ts` prefer `Manager`, `Service`, `Options` over `FooManager`, `FooService`, `FooOptions` — callers see `Foo.Manager` either way.
- Common suffix for constructor option-bag types is `Options` (e.g., `SpawnOptions`, `ManagerImplOptions`) — pick this over `Opts`/`Props`/`Config` for consistency.
- Consider taking an options object when a constructor or function has more than a few readonly props, especially when several are optional or share a logical grouping.
- Class member ordering (consider): static fields → public readonly → public mutable → private readonly (incl. constructor-injected) → private mutable → constructor → public methods → private methods. Within each group, rank properties roughly from most-important to least — importance signals include "further up the stack" (closer to public API), required over optional, readonly over mutable.
- For exported functions with multiple overloads, declare them as `const` with the overload signatures inline in the type annotation rather than using `export function` with repeated declarations. This keeps the implementation as an arrow function and groups all signatures together:
  ```ts
  export const myFn: {
    <T extends Foo>(a: T): Bar<T>;
    (a: string): Bar<any>;
  } = (a): Bar<unknown> => { ... };
  ```

### Testing

- place tests near modules as `module.test.ts`, use vitest with `describe`/`test` (not `it`), prefer `test('foo', ({ expect }) => ...)`.
- **Prefer extending existing test suites over creating new ones.** Before adding a test file, look for a suite that already covers the area and add cases there. A small number of cohesive suites is better than many fragmented ones.
- **Test behaviours at the level that is naturally the public API.** Exercise the seam consumers actually use (the package's exported surface, a service/manager's public methods) rather than reaching into private internals. This keeps tests resilient to refactors and documents real usage.
- Prefer unified `TestLayer` for all tests instead of creating a separate one for each test.
- `TestLayer(opts?)` can be parametrized so tests can configure it.
- Place test layer, configuration, and main definitions on top of the suite, while helpers go on the bottom.
- Avoid sleep and polling in tests as much as possible. Try to use events and TestClock instead.

### Namespaces exports in packages

- We're converting more and more packages to ones with namespaces exports. Example:

```text
src/
  Foo.ts
  Bar.ts
  errors.ts
  index.ts
  testing/
    index.ts
  internal/
    foo.ts
    bar.ts
    baz.ts
```

```ts
// index.ts
export * as Foo from './Foo';
export * as Bar from './Bar';
export * from './errors';
```

```ts
// Foo.ts

// @import-as-namespace
export const one = 1;
export const two = 2;
export const func: {
  (a: string): number;
  (a: number): string;
} = (a) => {
  return a;
};
```

- Code is organized into modules exported as namespace. Modules have capital case names.
- `@import-as-namespace` linter directive is used to mark the file as a namespace export.
- Internal code is hidden in the `internal/` directory that is not exported.
- `testing/` directory and `errors.ts` are the exception.
- Use `@dxos/echo` as a reference for this pattern.

### React

- Import all required symbols from React — hooks, types, and utilities — as named imports (i.e., use `useMemo` not `React.useMemo`, use `type Ref` not `React.Ref`).
- When using `forwardRef` use the variable name `forwardedRef`.

## New Packages

- **IMPORTANT**: Any new package created in this repo MUST have `"private": true` in its `package.json`. The `private` flag can only be removed manually once a trusted publisher has been configured for the package.

## Workflow

- Never work on `main`; always work within the session-generated worktree.
  - If there are unstaged changes, stash these and move them into the worktree; tell the user.
  - Before working on code, tell the user the worktree.
  - IMPORTANT: Do not change the branch or worktree name after you have started unless you are instructed to directly by the user.
  - **IMPORTANT**: Do NOT create new git branches unless the user explicitly asks. Work on the current branch only.
  - **IMPORTANT**: Always work in the worktree directory the harness assigned to you — do NOT `cd` into other worktrees or create parallel worktrees on the side. The harness UI tracks progress by watching that directory; working elsewhere makes changes invisible to the user. If the user asks you to continue a different branch, check out that branch in the assigned worktree (clean up the old branch first if needed); do not switch to another worktree path.
- Check `moon.yml` for available package tasks
- Run linter at natural stopping points
- Confirm work complete before final build/lint check
- If updating `pnpm-workspace.yaml` make sure to preserve comments.

## Interacting The User

- When collaborating closely with the User, determine if the user's role can be automated.
- Be precise about what you are asking the user to do and actively manage the process.
- **IMPORTANT**: Model the user as a very expensive, intermittent resource and minimize round-trips to them. The wasteful pattern to avoid: the user waits a long time for the agent to finish, only to be asked to test or supply something the agent could have anticipated.
  - At task start, analyze ALL human dependencies up-front (test credentials, assets, design decisions, accounts, manual verification steps).
  - Gather/build/scaffold anything obtainable autonomously BEFORE asking the user for anything.
  - Request all needed resources from the user in ONE batch, alongside a very concise plan; get a single go-ahead.
  - Then execute the remainder of the task uninterrupted; do not bounce back for things that could have been front-loaded.
  - If you hit an unforeseen human dependency mid-task, park it and continue all other reachable work; only surface an immediate ask when you are fully blocked and cannot make progress otherwise. Batch parked asks for the next checkpoint.

## PR Naming Convention

**IMPORTANT**: All PR titles MUST use conventional commit format:

Use scope when relevant: `feat(package-name): <description>`

Examples:

- `feat: add user authentication flow`
- `fix(echo): resolve memory leak in subscription handler`
- `refactor: simplify error handling in client SDK`
- `docs: update API reference for Space class`

## CI

- **IMPORTANT**: There is ONE main CI workflow ("Check") and it verifies **build, test, lint, and fmt**. If any of those are red on your branch, treat them as YOUR failures, not pre-existing ones — address the root cause of the failure on the branch rather than shrugging it off. Never merge around a red "Check".
- **IMPORTANT**: After every `git push`, proactively check CI status using `gh run list --branch <branch> --limit 5 --workflow "Check"`. Do NOT rely solely on `pnpm -w gh-action --verify` — it only checks agent workflows, not the main **Check** workflow that runs build and tests.
- If the Check workflow fails, inspect the failure with `gh run view <run-id>` and `gh run view <run-id> --log-failed`, identify the failing job/test, and fix it at the root cause.
- When the user asks "what is the CI status" or similar, always check the **Check** workflow specifically.

## Committing and Pushing

- **IMPORTANT**: Before every `git commit` and `git push`, run `git status` and check for ALL modified, staged, and untracked files. Every changed file must either be committed or explicitly acknowledged with the user. Never leave unstaged changes behind silently — if a file was modified during your work, it must be included in the commit or you must ask the user whether to include it.

## Submitting PRs

- When the user asks you to submit a PR:
  - Use `gh` CLI to create and manage PRs.
  - Merge `origin/main` in to current branch and resolve conflicts.
  - Format code with `pnpm format` and check that `moon run :lint -- --fix` succeeds.
  - Check `moon run :test` succeeds.
  - Commit and push ALL unstaged changes (including any edits that the user may have made in the worktree).
  - **IMPORTANT**: Verify `git status` shows a clean working tree after the final push. If any files remain modified or untracked, either commit them or confirm with the user before proceeding.
  - Monitor CI (every 5 minutes): `gh run list --branch <branch> --limit 3 --workflow "Check"` and `pnpm -w gh-action --verify --watch`.
  - You must attempt to diagnose and if possible fix all CI errors -- regardless of whether they relate to the current branch
  - **IMPORTANT**: Address and RESPOND to all PR review comments.
  - Update the PR description with a summary of the changes and the reasoning behind major changes.
  - Add any reference linear issues if available in PR description as "closes DX-123" or "part of DX-123".
  - **IMPORTANT**: DO NOT DELETE ANY BRANCHES OR WORKTREES THAT HAVE UNCOMMITTED CHANGES.
  - **IMPORTANT**: ALWAYS surface the Composer preview URL next to the PR number/link in chat summaries AND in the final message. The `preview-deploy.yml` workflow publishes a sticky `composer-preview` comment on the PR containing a branch-alias URL of the form `https://<branch-alias>.composer-app.pages.dev` and a per-deployment URL — fetch it with `gh pr view <pr> --json comments` (or `gh api repos/dxos/dxos/issues/<pr>/comments`) and include it verbatim. If the preview comment is not yet posted (deploy still running), say "preview pending" alongside the PR link and re-check on the next status update.

## Cursor Cloud specific instructions

### Toolchain

This project requires Node.js 24.x, pnpm 10.28.0, and moon 2.0.4. All are managed by **proto** (see `.prototools`). In the cloud VM, proto is installed at `~/.proto` and must be on PATH (`export PROTO_HOME="$HOME/.proto" && export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH"`). Do **not** use nvm; proto shims must take precedence.

### Running services

- **Composer app** (main app): `moon run composer-app:serve --quiet` starts a Vite dev server on port 5173. The app auto-creates a local identity on first load; no external auth is required.
- **Tasks app**: `moon run tasks-app:serve`
- **Docs site**: `moon run docs:serve`
- See `REPOSITORY_GUIDE.md` for the full list of run commands.

### Gotchas

- `pnpm install` must run with `CI=true` or `HUSKY=0` in non-interactive environments to skip the husky git hooks setup prompt.
- The `DEPOT_TOKEN` warning from moon is expected and harmless (remote caching auth token).
- The `pnpm.onlyBuiltDependencies` allowlist in `pnpm-workspace.yaml` controls which native addons are built; warnings about "ignored build scripts" for packages not in the list are normal.
- Builds must complete before running `serve` commands, because moon tasks have `deps` on `:prebuild`/`:build` targets.
- No Docker or external services are required for unit tests or local dev. Signal servers for networking tests are pre-compiled binaries spawned automatically by tests.

### DXOS APIs

Read additional information about DXOS APIs in ./agents/instructions
