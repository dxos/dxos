---
'@dxos/types': minor
'@dxos/plugin-github': minor
---

Add a `Repo` type (host-agnostic source repository, with provenance carried by foreign keys) and `Project.repo` naming the repository a project's work lands in. `#nnn` references resolve against the project's repository, falling back to the single repository a space mirrors.
