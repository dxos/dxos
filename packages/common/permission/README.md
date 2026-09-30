# @dxos/permission

The permission DSL and its pure evaluator: subjects, commands, policies, permissions, grants,
requirements, and `check`. No crypto, no ECHO, no services; signing is HALO's job and storage is
the caller's. The design, prior art and integration plan are in [`docs/DESIGN.md`](./docs/DESIGN.md).

Status: scaffold. `Command` is the first module; the schemas and the evaluator follow it.
