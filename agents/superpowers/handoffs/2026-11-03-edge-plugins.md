# Handoff: EDGE-side plugins (prototype)

Composer plugins build to one bundle, EDGE stores it, and compute-service runs its operations in a
Dynamic Worker. Each plugin runs alone on EDGE (spec D-41): it may import another plugin's package for
types, but nothing is bundled or activated beside it.

Spec: `packages/sdk/app-framework/docs/EDGE-PLUGINS.mdl`. Tracking: Composer project
[Edge-side plugins](https://preview.composer.space/w/BPBG3HN4O2XTMB5MRDZQXJBAXA7LAH4IA/project/01M6G82PMEX1AT5SP3AXB61S93?title=Edge-side+plugins)
(milestones, tasks, PRs attached). The edge-side twin of this file is
`docs/plans/2026-11-03-edge-plugins-handoff.md` in `dxos/edge`.

## Where the work is

| Repo      | PR                                                | Branch                        | State                                               |
| --------- | ------------------------------------------------- | ----------------------------- | --------------------------------------------------- |
| dxos/dxos | [#14334](https://github.com/dxos/dxos/pull/14334) | `worktree-edge-plugins-host`  | Ready; CI blocked (see below)                       |
| dxos/edge | [#1426](https://github.com/dxos/edge/pull/1426)   | `claude/edge-plugin-releases` | Ready; includes multipart upload (#1453, merged in) |
| dxos/dxos | #14318 (spec), #14375 (build-only split)          | —                             | Merged                                              |

## What #14334 contains

- `@dxos/protocols` `PluginProtocol`: the typed `describe()` / `invoke()` contract between EDGE and a bundle.
- `@dxos/edge-compute/plugin-loader`: turns one bundle into Worker Loader modules (rewrites bare imports via
  `vendor/manifest.json`, prunes unreachable vendor files, generates the main module).
- `@dxos/plugin-host-cloudflare` (private): the runtime vendored into every bundle.
- `@dxos/plugin-builder` (private, Node): `buildBundle`, `verifyBundle`, bins `check-bundle` / `check-release`.
- `dx registry publish --channel --upload-only`; the CLI spawns the installed builder's `check-bundle`.
- `@dxos/app-framework/vite-plugin/config`: loads `dx.config.ts` without Vite (excluded from the import map).
- CI step `check-edge-release` over every package tagged `edge-release` (15 plugins).
- Manifest loaders (Composer, `dx`, EDGE) load a module's local adapter chunk.

## What #1426 contains

- registry-service `PluginStore`: D1 index (`PluginBundle`, `PluginChannel`, `PluginOperation`; migrations
  0002, 0003), R2 `modules/<key>/<version>/`, channels as npm dist-tags (`latest` moves on non-prerelease),
  `describe()` via Worker Loader on every upload, refuses failures and key conflicts.
- Routes `/edge/plugins…` (list, version, channel PUT, revoke); RPC `resolveOperation(operationKey, channel)`.
- Multipart upload streamed into R2 (`StagedUpload.ts`, `multipart.ts`).
- compute-service `plugin-router`: resolves a route, reads the bundle from R2 (`PLUGIN_BUNDLES`), runs it via
  `PluginLoader.workerCode`; falls back to operation-service.
- Edge pins dxos at `abb7abb` (pkg.pr.new build of this branch) in `pnpm-workspace.yaml`.

## CI status (2026-11-03)

- **#14334**: red from two broken moon remote-cache entries archived without outputs: `types:build`
  (`2e929173`, no `dist/types`) and `react-ui-experimental:prebuild` (`1f46dc8e`, no generated shaders).
  Commit `4e85916` adds a comment to `packages/sdk/types/src/index.ts` and
  `react-ui-experimental/src/shaders/glsl/dof.frag` to change those keys; its run was in progress at handoff.
  A stale-cache fix on `main` was announced but had not landed when this was written; merge `main` once it does.
  Known unrelated failures: `recover identity @QA-5` (fails on `main` too), `review-present` (every PR).
- **#1426**: red only on agent tests whose recorded LLM fixtures drifted with the dxos bump (8ad08cb → abb7abb).
  Not plugin code. Landing order: land #14334 → edge's "Bump dxos catalog" workflow re-records fixtures →
  rebase #1426 onto that bump.

## edge-dev state

- registry-service and compute-service deployed; D1 migrations 0002/0003 applied. Multipart not yet deployed.
- Uploaded and indexed (14): thread, space, illustrator, markdown, sheet, file, magazine, github, tasks, inbox,
  discord, assistant, agent, projects. presenter (56 MB) needs the multipart route: redeploy registry-service,
  then upload.
- Not yet verified: invoking an operation end to end on edge-dev. Needs a dev API token in
  `.secrets/dev-api-token.env` (`DX_API_TOKEN=`).

## Picking it up locally

```bash
git fetch origin worktree-edge-plugins-host && git worktree add ../edge-plugins-host worktree-edge-plugins-host
```

Use that worktree (or a harness-assigned one) for dxos; check out `claude/edge-plugin-releases` in the edge
repo. Link local dxos into edge instead of waiting for pkg.pr.new:

```bash
pnpm link-packages
```

That runs `scripts/link-packages.mjs ../dxos --all --install` from the edge checkout. Never commit the
`file:` overrides it writes to edge's root `package.json`. Useful checks:

```bash
moon run edge-compute:test -- src/plugin-loader
```

```bash
moon run plugin-markdown:check-edge-release
```

In edge: `moon run registry-service:test` and `moon run edge:test -- test/plugin-store.node.test.ts`.

## Next steps

1. Get #14334 green (cache fix above; QA-5 is `main`'s), get a human approval, land it.
2. Rebase #1426 onto edge's automated dxos bump; land it.
3. Redeploy registry-service to edge-dev and upload presenter; verify an invocation once the dev token exists.
4. Pre-seed the registry for e2e flows: in edge's test harness, upload each
   `node_modules/@dxos/plugin-*/dist/plugin` (packages already ship it) before tests; route compute-service
   through `resolveOperation` with operation-service as fallback until no flow hits it.
5. After landing: publish `@dxos/plugin-host-cloudflare` and `@dxos/plugin-builder` to npm
   (`scripts/publish-package.mjs --trust`); per-space channel (D-37).
