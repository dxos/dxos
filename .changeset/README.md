# Changesets

This directory is managed by [Changesets](https://github.com/changesets/changesets).

`config.json` is **generated** by the toolbox (`tools/toolbox/src/toolbox.ts::updateChangesets`) on
`pnpm install` — do not edit it by hand. It encodes the two fixed publish groups (Group A: core/SDK;
Group B: plugins + cli) from the workspace graph.

To record a release, add a changeset describing your change (when the change is consumer-relevant — a
changeset is not required for chores). See the authoring guide:
[`agents/instructions/changesets.md`](../agents/instructions/changesets.md).

Releases run in GitHub Actions, never locally (see [`docs/RELEASING.md`](../docs/RELEASING.md)):

- **`@latest`** — every push to `main` has `publish-all.yml` maintain a "Version Packages" PR; **merging
  that PR** publishes the bumped packages (npm OIDC + provenance). npm publishing lives in `publish-all.yml`
  because the OIDC trusted publisher is bound to that workflow filename.
- **`@next`** — run the **Release (next)** workflow (`release-next.yml`, manual `workflow_dispatch`). It cuts
  a **snapshot release** (`changeset version --snapshot next` → `changeset publish --tag next`); there is no
  `pre` mode and no long-lived `next` branch.

Apps (Composer, docs, examples) **deploy** on their own cadence via the app workflows and never publish to
npm — deploy is fully decoupled from this changeset flow.
