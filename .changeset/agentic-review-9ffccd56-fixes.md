---
'@dxos/client-services': minor
'@dxos/plugin-assistant': patch
'@dxos/assistant-toolkit': minor
'@dxos/compute': minor
'@dxos/compute-runtime': minor
'@dxos/ai': minor
'@dxos/sql-sqlite': minor
---

Fix EDGE-configured hosts silently never using their edge client for invitation admission and agent creation, resync stale profile fields when an identity changes elsewhere, subscribe to previously-unwatched ECHO fields across several article surfaces, and replace several hand-rolled list/wrapper divs with the shared Listbox/Flex/Grid primitives.

**Breaking:** several published namespace exports were renamed for consistency with the
`import-as-namespace` convention (the `Foo`-prefix on a member of a `Foo` namespace was redundant).
Pre-1.0, these ride a minor rather than a major:

- `@dxos/assistant-toolkit`: `Memory` (was a namespace wrapping a `Memory` class; the root export is
  now the class itself)
- `@dxos/compute`: `Trace.TraceWriter` → `Trace.Writer`
- `@dxos/compute-runtime`: `ProcessManager.ProcessManagerImpl` → `ProcessManager.Impl`,
  `ProcessHandle.ProcessHandleImpl` → `ProcessHandle.Impl`
- `@dxos/ai`: `ScriptedLanguageModel.scriptedLanguageModelLayer` → `ScriptedLanguageModel.layer`
- `@dxos/sql-sqlite`: `OpfsWorker.OpfsWorkerConfig` → `OpfsWorker.Config`

Consumers pinning these packages (e.g. `dxos/edge` via `pkg.pr.new`) need to update to the new names.
