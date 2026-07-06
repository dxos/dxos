# Changesets

This directory is managed by [Changesets](https://github.com/changesets/changesets).

`config.json` is **generated** by the toolbox (`tools/toolbox/src/toolbox.ts::updateChangesets`) on
`pnpm install` — do not edit it by hand. It encodes the two fixed publish groups (Group A: core/SDK;
Group B: plugins + cli) from the workspace graph.

Adding a changeset does **not** cut a release — it describes your change so it lands in the changelog and
version bump of whenever the next release is made. Add one when the change is consumer-relevant (a
changeset is not required for chores). See the authoring guide:
[`agents/instructions/changesets.md`](../agents/instructions/changesets.md).

Releases run in GitHub Actions, never locally: `@latest` is published when a human **merges the
"Version Packages" PR**; `@next` snapshots come from a manual dispatch of the same `publish-all.yml`. Apps
deploy separately and never publish. Full flow: the [Releasing](../REPOSITORY_GUIDE.md#releasing) section of
the repository guide.
