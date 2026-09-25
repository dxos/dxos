# Task-planning skill ⇄ Composer space sync

Date: 2026-08-01 · Status: draft (overnight; for review) · Owner: burdon
Project: `mcp` (milestone 3, task 3). Builds on the verified local loop
(Claude ⇔ MCP ⇔ EDGE ⇔ Composer) and the object CRUD tools (edge #785).

## Goal

The task-planning skill (`tools/claude/plugins/dxos/skills/task-planning`) keeps each project's TASKS in a
**Composer document** instead of (or alongside) a repo `TASKS.md`, so tasks are live objects —
visible in Composer, editable by humans and agents concurrently, and queryable by other tooling.

## Design

### Registry pointer

`.agents/projects/registry.yml` gains one optional field per project:

```yaml
- name: mcp
  ...
  tasks: .agents/projects/mcp/TASKS.md      # unchanged; local ledger (fallback / cache)
  tasksDxn: 'echo://BHSYEBCA…/01KYXRR1…'    # NEW optional: ECHO URI (spaceId/objectId) of the tasks doc
```

- `tasksDxn` is the `echo://<spaceId>/<objectId>` URI of a **text-bearing document** (markdown
  document or outline) holding the task checklist. Space id is embedded in the URI — no second field.
- Absent → the skill behaves exactly as today (file only). Present → the document is the shared
  copy; the file remains the offline cache (see Sync).

### Access path

The skill reads/writes through the local MCP server (`mcp-space-service:8791` → operation-service
→ edge), using the session identity from the OAuth stub or (later) `dx mcp` device pairing:

- Read: `getObject(tasksDxn)` → follow `content` ref → text (or `readDocument`-equivalent once a
  text read verb exists; see Open questions).
- Write: `updateObject(tasksDxn, edits: [...])` — string edits, CRDT-merged server-side, so
  concurrent human edits in Composer are not clobbered. Never whole-file rewrites.
- Task semantics stay **markdown checklist lines** (`- [ ] …` / `- [x] …`), same grammar the
  outliner renders — so an Outline object works as the tasks doc unmodified.

### Sync model (file ⇄ document)

Keep it dumb and explicit; no daemon:

- `/dxos:project resume` / session start: if `tasksDxn` set and MCP reachable → fetch document, write through
  to the local file (the file is a mirror + offline fallback), note divergence if the file had
  unpushed local edits (three-way vs last-sync copy stored beside it as `.TASKS.md.base`).
- `/dxos:project track` / `hydrate` / task edits: apply as **targeted string edits** to the document via
  `updateObject.edits` (find the exact line, replace/append), then refresh the mirror.
- MCP unreachable → edit the file only and flag "pending push" in the resume note; next reachable
  session reconciles (line-level merge; conflicts surfaced to the user, never auto-dropped).

### Identity / auth

The skill uses the developer's own identity (Path A identity-key stub locally, Path B device
pairing when it lands). The tasksDxn's space must be in the session's space context. No secrets
in the registry — the DXN is an address, not a capability.

## Alternatives considered

- **Task objects (org.dxos.type.task) instead of a checklist document** — richer (status/assignee/
  priority), but loses the one-file-one-glance ledger ergonomics the skill's workflow depends on,
  and requires the dedicated task verbs (milestone-3 task 4) to be pleasant. The checklist document
  is the bridge; the outliner's convert-to-task covers promotion of individual items. Revisit after
  task 4's plugin design.
- **Registry stores spaceId+objectId as separate fields** — the echo URI already encodes both.
- **Bidirectional daemon sync** — rejected; explicit sync points (`resume`/`track`/`hydrate`)
  match the skill's existing rhythm and keep conflict windows small.

## Open questions (for review)

1. Should the MCP server grow a `readText`/`writeText` verb pair (text-bearing docs) instead of
   the two-hop `getObject`(content ref)→`getObject`(Text)? Leaning yes — pairs with task 4.
2. Mirror-file location for `.TASKS.md.base` (sync base) — hidden sibling vs `.agents/state/`.
3. Should `$project new` offer to create the Composer doc (via MCP) and stamp `tasksDxn`?

## Prerequisites already in place

- Object CRUD + discovery tools (edge #785); `markdown.update` widened to outlines (#12423) —
  active for text edits once edge bumps its @dxos pin.
- Local runbook: `.agents/projects/mcp/TESTING.md`.
