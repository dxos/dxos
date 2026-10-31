# @dxos/permission

## 0.17.0

### Minor Changes

- a843e27: Add opt-in operation permissions. `@dxos/permission` is the permission DSL and its pure evaluator, with the design document: principals (any URI), subjects, commands with prefix coverage, UCAN-style policies, permissions, requirements, content-addressed grants with attenuation, revocation, consent, and `Check.check` over a `GrantSource`; `Guard` turns a principal and its grants into a process guard. In `@dxos/compute`, an operation can declare requirements (`Operation.RequiresAnnotation`, set with `Guard.requires`), and a process can be spawned with a `Process.Guard` (`SpawnOptions.guard`) that its children, detached ones included, inherit and can only narrow. An operation that declares requirements is refused with `OperationDeniedError` unless the invoking process's guard admits it; operations that declare none are never checked. `AgentService.GetSessionOptions.guard` spawns an agent session under a guard, so the agent's tool calls are checked. Guards are not persisted and are not yet sent to EDGE.

### Patch Changes

- Updated dependencies [3aef671]
- Updated dependencies [a18cb35]
- Updated dependencies [a843e27]
- Updated dependencies [8d7d5e1]
- Updated dependencies [768db81]
  - @dxos/keys@0.17.0
  - @dxos/compute@0.17.0
  - @dxos/errors@0.17.0
