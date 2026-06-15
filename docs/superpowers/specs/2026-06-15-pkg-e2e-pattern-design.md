# `<pkg>-e2e` Test Package Pattern

Date: 2026-06-15
Status: Design (approved for spec review)

## Problem

Tests colocated inside a source package have three recurring problems:

1. **They drift away from the public API.** Colocated tests can reach into relative
   internal modules (`../echo-handler`, `../proxy-db`), so they test implementation
   details rather than the contract consumers actually use.
2. **They force test-only dependencies onto the package.** Heavy integration deps
   (e.g. `@dxos/teleport/testing`, `@dxos/echo-host`) end up as `devDependencies`
   of the package under test, bloating its graph and risking dependency cycles.
3. **Nothing stops other packages from depending on test scaffolding.** A test
   package shaped as a normal library can be imported by production code.

## Goal

Establish a repeatable convention: for a package `@dxos/<pkg>`, public-API and
integration tests live in a sibling, test-only package `@dxos/<pkg>-e2e`.

This:

- **Forces public-API testing** — the `-e2e` package can only import `@dxos/<pkg>`
  and `@dxos/<pkg>/testing`, never internals.
- **Isolates extra deps** — heavy/integration deps live on `-e2e`, never on the
  package under test, avoiding cycles and graph bloat.
- **Is unimportable** — moon's layer enforcement forbids any project depending on
  an `-e2e` package.

## Non-Goals

- Replacing fast white-box/unit tests. Those stay colocated in `@dxos/<pkg>`.
- Playwright/browser e2e. Those keep using the existing moon `e2e` tag and the
  `packages/e2e/*` Playwright harnesses; this pattern is for node/vitest suites.
- Publishing. `-e2e` packages are never published.

## Convention

### Naming & location

- Package name: `@dxos/<pkg>-e2e`.
- Location: sibling directory next to the package under test, e.g.
  `packages/core/echo/echo-client-e2e` next to `packages/core/echo/echo-client`.

### Package shape (test-only)

`package.json`:

- `"private": true`.
- **No** public `publishConfig`, **no** `exports`/library entrypoint, **no**
  `src/index.ts` to export. The package contains only `*.test.ts`.
- `dependencies`: `@dxos/<pkg>` as `workspace:*`, plus any heavy/extra deps the
  suite needs (workspace deps as `workspace:*`, externals from the catalog).

Because nothing can depend on this package (see enforcement), those extra deps
never enter the graph of `@dxos/<pkg>` — no cycles, no bloat.

### moon.yml

```yaml
layer: automation
language: typescript
tags:
  - ts-test
  - typecheck
```

- `layer: automation` — moon's top layer. `enforceLayerRelationships` (on by
  default) means **no project may depend on it**, while it may still depend on
  any lower layer (`library`/`application`/`tool`). This is the entire enforcement
  mechanism; no custom `constraints`/`tagRelationships` are required.
- `ts-test` — runs vitest (`test` task); already deps on `^:compile`, so upstream
  deps are compiled automatically.
- `typecheck` — runs `tsc --noEmit` (`build` task) with no build artifact.
- **No** `ts-build`, `pack`, or `compile` entrypoint — there is no library output.

### Where helpers live

Shared test harness, builders, and fixtures live in `@dxos/<pkg>/testing` (the
existing `./testing` entrypoint). Both the package's own colocated tests and the
`-e2e` package import them. The `-e2e` package contains **only `*.test.ts`** — no
shared code, no exports.

### Test split

| Test kind | Location | May import |
| --- | --- | --- |
| Fast unit / white-box | `@dxos/<pkg>/src/**/*.test.ts` | public API, `./testing`, relative internals (`../foo`) |
| Public-API | `@dxos/<pkg>-e2e/src/**/*.test.ts` | `@dxos/<pkg>`, `@dxos/<pkg>/testing` only |
| Integration / heavy-dep | `@dxos/<pkg>-e2e/src/**/*.test.ts` | the above + extra `-e2e`-only deps |

Heuristic: a test belongs in `-e2e` if it is expressible purely against
`@dxos/<pkg>` + `@dxos/<pkg>/testing`. A test that fundamentally needs relative
internal modules or sibling units stays colocated as a white-box test.

### Terminology

The `-e2e` **package suffix** (node/vitest public-API suite) is distinct from the
moon `e2e` **tag** (Playwright browser suite, `tag-e2e.yml`). A node `-e2e`
package never carries the `e2e` tag.

## Enforcement

`layer: automation` + `enforceLayerRelationships: true` (moon default). The layer
hierarchy, highest to lowest, is:

```
automation → application → tool → library → scaffolding → configuration
```

A layer may depend on lower layers but never higher ones, and `automation`/
`application` may not even depend on themselves. Since `automation` is the top
layer, any project that lists an `-e2e` package as a dependency fails at task-graph
build time. No bespoke script or lint rule is needed.

## Reference Migration: `assistant-e2e`

`@dxos/assistant-e2e` (`packages/core/compute/assistant-e2e`) currently violates
the convention: `layer: library`, `pack` tag, public `publishConfig`, a `compile`
entrypoint, and `exports` — i.e. it is a publishable library that other packages
*could* depend on. Bring it into conformance:

- `package.json`: keep `"private": true`; remove `publishConfig`, remove `exports`
  (and the `src/index.ts` library entrypoint if unused by tests), keep deps.
- `moon.yml`: set `layer: automation`; tags become `[ts-test, typecheck]` (plus
  `memoized-llm` which it already needs); drop `pack`, `ts-build`, and the
  `compile` entrypoint args.
- Verify `moon run assistant-e2e:test` and typecheck still pass.

## Migration: `echo-client` → `echo-client-e2e` (conservative)

Create `packages/core/echo/echo-client-e2e` following the convention, then move
**only** tests expressible against the public + `./testing` API as-is. Genuinely
white-box tests stay colocated. No new internal-symbol promotion unless trivial.

### Move (strong candidates)

The suites already under `src/testing/` are public-API/integration oriented and
pull heavy, test-only deps that should leave `echo-client`:

- `src/testing/integration.test.ts` — uses `@dxos/teleport/testing`,
  `@dxos/echo-host`, `@dxos/echo/internal`; the clearest case for relocation.
- `src/testing/queue.test.ts`
- `src/testing/Obj.updateFrom.test.ts`

Plus any top-level `*.test.ts` whose only non-public imports are symbols already
re-exported from `@dxos/echo-client/testing` (e.g. `getObjectCore`,
`EchoTestBuilder`, `createTmpPath`). These are rewritten to import from
`@dxos/echo-client` and `@dxos/echo-client/testing` instead of relative paths.

### Stay colocated (white-box)

Tests that import relative internals or sibling units remain in `echo-client`,
e.g. those importing `../proxy-db` types (`DatabaseImpl`, `EchoDatabase`),
`../automerge`, or a sibling module under test (`./core-database`).

### Dependency cleanup

After moving, audit `echo-client`'s `devDependencies` and drop any that are now
used only by relocated tests (moving them to `echo-client-e2e`). This is the
concrete payoff: heavy test deps and potential cycles leave the runtime package.

### Per-file classification

Classification of the 32 existing test files is an implementation-plan step, using
the heuristic above (movable iff expressible against public + `./testing`). The
plan enumerates each file's destination and any import rewrites.

## Rollout order

1. Land the convention (this spec) + the `assistant-e2e` conformance migration as
   the canonical reference.
2. Create `echo-client-e2e` and perform the conservative `echo-client` migration.
3. Apply the pattern to further packages as their test suites warrant it.

## Open questions

None blocking. Future packages may reveal cases where promoting a few internal
symbols into `./testing` unlocks materially more public-API coverage; handle those
case-by-case rather than pre-emptively widening the public surface.
