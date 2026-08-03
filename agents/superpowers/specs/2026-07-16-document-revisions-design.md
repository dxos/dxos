# Document Revisions & Branches — Spec Pointer

Approved 2026-07-16 after brainstorm (mocks in `.superpowers/brainstorm/`).

The canonical design lives with the code:
**[`packages/plugins/plugin-comments/DESIGN.md`](../../../packages/plugins/plugin-comments/DESIGN.md)**

Scope summary:

- Checkpoints (`Version`) = named automerge heads on a `Text`'s leaf doc; zero-copy;
  read-only time travel via `A.view`; restore = new forward edit.
- Branches (`Branch`) = child `Text` objects forked from a parent Text at anchor heads;
  tree via `parent` refs; merge-back = textual 3-way merge (true CRDT forks are phase 2).
- `Markdown.Document.history = { branches, versions }`; viewing selection is per-user
  local state.
- UI: dedicated History companion tab (branches + checkpoint timeline), compact
  ObjectProperties "Versions" section, editor banner for checkpoint/branch modes,
  three diff renderings (inline / side-by-side / gutter) behind a `diffView` plugin
  setting.
- Agent operations: `create-checkpoint`, `create-branch`, `merge-branch`, `get-history`.
- Phase 2: lift `Version`/`Branch` to `@dxos/schema` (generic over automerge-backed
  objects), core shared-history forks, fragment-compaction alignment.
