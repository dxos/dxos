# Cross-Repo Development

How to develop against **unreleased** code that lives in another DXOS repo (e.g. a downstream repo consuming `dxos` core, or `edge` consuming `dxos`). Full rationale: [`docs/design/release-spec.md`](../../docs/design/release-spec.md).

There are three tiers. Pick the lowest one that fits, and never commit a higher-friction tier's artifacts.

## Decision tree

1. **Editing code in two repos at the same time, locally?**
   → Tier 3 (**link**). Check out both repos side-by-side, then from the downstream repo run `link-packages.mjs <path-to-upstream-repo>` to link the upstream packages in via tarball + `pnpm.overrides`. Unlink and depend on a real version **before committing**.

2. **Need to merge something on `main` that depends on an upstream change that isn't released yet?**
   → Tier 2 (**pkg.pr.new**). Pin the downstream dependency / catalog entry to the upstream commit's pkg.pr.new SHA URL. Merge. **Re-pin to a real release** once upstream publishes one.

3. **Cutting or preparing a release?**
   → Tier 1 (**npm**). Depend on a published version — `@latest`, or a deliberate `@next` / `@beta` pre-release. This is the only thing that ships to users.

## Tiers

- **Tier 1 — stable floor (npm).** Published `@latest` (or deliberate `@next`/`@beta`). Pinned in `package.json` / catalog. Reproducible and permanent. The default for any committed downstream dependency.

- **Tier 2 — continuous (pkg.pr.new).** SHA-pinned URLs from the upstream's per-commit pkg.pr.new publish. SHA-immutable but **perishable** (artifacts expire ~1 month idle / ~6 months). May be committed, but treat it as temporary: re-pin to a real release before anything you must rebuild later depends on it. Never the version a release ships against.

- **Tier 3 — local dev (link).** `link-packages.mjs` writes tarball `file:` entries into `pnpm.overrides`. Fastest iteration when editing both repos. **Never commit** the overrides or the `.local-pack` directory — CI rejects any committed `file:` override / `.local-pack`.

> Producing the Tier-1 versions is done **by GitHub Actions**, never by running `changeset` / `pnpm publish` locally: merge the "Version Packages" PR for a stable `@latest` release, or push to the `next` branch for a `@next` pre-release. See [`docs/design/release-spec.md`](../../docs/design/release-spec.md) §6.

## Dependency-cycle rules

- The **global package graph** (union of all repos) MUST be a DAG. The unit of the rule is the published **package**, not the repo. No package may transitively depend on itself.
- **Repo-level reference cycles are fine** — repo A may depend into B while B depends into A, as long as no individual package cycle exists. Check the package graph, not the repo arrows.
- **Package-level cycles are forbidden** — even through published versions. Break them by extracting the shared part into a lower package.
- **Shared definitions go in a leaf contract/schema package** at the bottom of the stack (the proto/IDL pattern), depended on by both sides — never sideways between them. Keep that package genuinely low-level.
- Cross-repo edges in committed code use **pinned published versions only** (Tier 1/2); Tier 3 is dev-only.
- A cross-repo cycle check (ownership map + union-graph) gates PRs once the second repo lands; if it fails, the fix is to push shared definitions down into a leaf, not to relax the check.
