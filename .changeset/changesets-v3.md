---
'@dxos/toolbox': patch
---

Upgrade the release tooling to Changesets v3.

`.changeset/config.json` pins `format: "oxfmt"` so a generated `CHANGELOG.md` matches what CI checks, and a new `check-changeset-bumps` gate rejects `major` bumps while the SDK is pre-1.0.
