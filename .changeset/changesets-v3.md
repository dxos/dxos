---
'@dxos/toolbox': patch
---

Upgrade to Changesets v3 and drop the `@changesets/assemble-release-plan` patch it makes obsolete.

v3 removes the force-escalation that bumped a peer-dependent to `major` for any non-patch change — peer dependents now take a `patch` like any other dependent. That was the sole reason for the local patch and for `onlyUpdatePeerDependentsWhenOutOfRange`, so both are gone and a `0.x` minor no longer cascades the fixed group to `1.0.0`.

The generated `.changeset/config.json` pins `format: "oxfmt"` rather than relying on v3's `auto` formatter detection, so a generated `CHANGELOG.md` matches what CI checks.
