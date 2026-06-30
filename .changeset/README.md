# Changesets

This directory is managed by [Changesets](https://github.com/changesets/changesets).

`config.json` is **generated** by the toolbox (`tools/toolbox/src/toolbox.ts::updateChangesets`) on
`pnpm install` — do not edit it by hand. It encodes the two fixed publish groups (Group A: core/SDK;
Group B: plugins + cli) from the workspace graph.

To record a release, add a changeset describing your change. See the authoring guide:
[`agents/instructions/changesets.md`](../agents/instructions/changesets.md).

Releases run in GitHub Actions, never locally: merge the "Version Packages" PR for a `@latest` release,
or push the `next` branch for a `@next` pre-release. Apps **deploy** independently of this flow and never
publish to npm.
