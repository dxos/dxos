---
'@dxos/plugin-google': patch
'@dxos/plugin-connector': patch
---

The Gmail connector no longer requests the `gmail.readonly` OAuth scope — `gmail.modify` already includes read access, and the runtime scope request must exactly match the set declared for Google's restricted-scope verification. The Google scope sets are now pinned in `@dxos/plugin-google` (`src/scopes.ts`) with a test that fails on any change, and the CLI connector preset uses `gmail.modify` accordingly. Existing connections are unaffected; new authorizations request one fewer scope.
