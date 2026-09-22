---
'@dxos/plugin-github': patch
---

Generating a walkthrough no longer fails because of the space's GitHub credential. The pull-request
and diff reads now take the same anonymous retry the import path already took, so a public pull
request stays readable when the stored token is revoked (401), suspended or SSO-blocked (403), or
belongs to an App installation the repository sits outside of (404) — the last of which made a
public repository read as absent, and a pull request a space had imported anonymously impossible to
narrate. The retry moves into `withAnonymousFallback`, shared by both paths rather than written once
for import.

An empty answer from the model is also retried once and, if it comes back empty again, reported as a
failure instead of stored. The output allowance covers the model's reasoning as well as its answer,
and adaptive reasoning occasionally spends all of it, which previously produced a walkthrough that
was nothing but its appended "Also changed" section.
