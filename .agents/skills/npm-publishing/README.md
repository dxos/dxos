# npm-publishing

Makes a new `@dxos/*` package publishable on npm: one bootstrap publish, then an npm trusted publisher
(OIDC) so `publish-all.yml` can release it from then on. Agents follow [`SKILL.md`](./SKILL.md).

## Quick start

```bash
node scripts/publish-package.mjs @dxos/<name> --dry-run --trust
```

```bash
node scripts/publish-package.mjs @dxos/<name> --trust
```

- A package not yet on npm is built and published at `0.0.0`; its `package.json` version is restored.
- A package already on npm skips the publish.
- `--trust` runs `npm trust github` (npm ≥ 11.15, via `npx` if needed). npm prints a URL after ~40s:
  press ENTER and approve in the browser within ~5 minutes.
- Without `--trust`, the script prints the settings and opens the package's npm access page instead.

The package must not be `"private": true` and needs `"publishConfig": { "access": "public" }`.

## See also

- [`scripts/publish-package.mjs`](../../../scripts/publish-package.mjs) — the script.
- [`REPOSITORY_GUIDE.md`](../../../REPOSITORY_GUIDE.md) §New npm packages and §Releasing.
- [`.github/RELEASE-SPEC.md`](../../../.github/RELEASE-SPEC.md) — why releases work this way.
