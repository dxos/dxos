# Changesets

This directory is managed by [Changesets](https://github.com/changesets/changesets).

`config.json` is **generated** by the toolbox (`tools/toolbox/src/toolbox.ts::updateChangesets`) on
`pnpm install` — do not edit it by hand. It encodes the two fixed publish groups (Group A: core/SDK;
Group B: plugins + cli) from the workspace graph.

Adding a changeset does **not** cut a release — it describes your change so it lands in the changelog and
version bump of whenever the next release is made. Add one when the change is consumer-relevant (a
changeset is not required for chores). See the authoring guide:
[`agents/instructions/changesets.md`](../agents/instructions/changesets.md).

Releases run in GitHub Actions, never locally (see [`docs/RELEASING.md`](../docs/RELEASING.md)):

- **`@latest`** (stable) — **published only when a human merges the "Version Packages" PR**, not on push.
  On each push to `main`, `publish-all.yml` just keeps that PR up to date (draining pending changesets into
  version bumps + changelog entries) — it publishes nothing. Merging the PR is the release: that run does
  the npm publish (OIDC + provenance). (npm publishing lives in `publish-all.yml` because the OIDC trusted
  publisher is bound to that workflow filename.)
- **`@next`** (pre-release) — **published by manually running the Publish workflow** (`publish-all.yml`) via
  `workflow_dispatch`. A manual run cuts a throwaway **snapshot release** (`changeset version --snapshot
  next` → `changeset publish --tag next`) — no `pre` mode, no long-lived `next` branch, and it never touches
  `@latest`. (Same workflow as `@latest`, because npm's OIDC trusted publisher is bound to that filename;
  the trigger — push vs. manual dispatch — selects the channel.)

Apps (Composer, docs, examples) **deploy** on their own cadence via the app workflows and never publish to
npm — deploy is fully decoupled from this changeset flow.
