# @dxos/permission

The permission DSL and its pure evaluator: subjects, commands, policies, permissions, grants,
requirements, and `check`. No crypto, no ECHO, no services; signing is HALO's job and storage is
the caller's. The design, prior art and integration plan are in [`docs/DESIGN.md`](./docs/DESIGN.md).

Modules (namespace exports): `Principal`, `Subject`, `Command`, `Policy`, `Permission`, `Requirement`,
`Grant`, `Revocation`, `Consent`, `Check`, plus the typed errors. `src/Check.test.ts` walks every way
a check passes or fails and is the quickest way to read the semantics.

Status: the API is complete and the evaluator is pure and in-memory; HALO signing, the membership
and credential grant sources, and the operation and process hooks live in later milestones.
