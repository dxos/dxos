---
'@dxos/echo': minor
---

Objects now have a **mnemonic**: the last 6 characters of their id, uppercased — short enough for a person to read out or type, and stable for the life of the object.

- `Obj.getMnemonic(obj)` returns it; `EntityId.getMnemonic` / `normalizeMnemonic` / `isValidMnemonic` back it in `@dxos/keys`.
- `Filter.mnemonic(str)` queries by it (case-insensitive input). It is a new `mnemonic` filter AST node, evaluated as a local predicate over a wildcard select, and composes with `Filter.and` / `Filter.not` like any other filter.
- The task list renders each task's mnemonic in monospace ahead of its title.
