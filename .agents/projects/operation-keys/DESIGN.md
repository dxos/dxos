# operation-keys — Design

## Problem

Operation keys had drifted into two unrelated shapes with no meaning attached to either:
263 on `org.dxos.plugin.<plugin>.operation.<verb>`, 89 on `org.dxos.function.<domain>.<verb>`.
The split did not track audience — both carried skill-wired, model-facing operations — it tracked
which package the author happened to copy from. `MarkdownOperation.ts` used both in one file.

Because the model-facing tool name derives from the key (PR #12677), the shape is no longer only a
registry concern: it decides what the model calls, and a key outside the stripped prefix produced
names as long as 63 characters against MCP's 64-character budget.

## Decision

`<owning-root>.operation.<domain>.<verb>`

- `operation` names the kind, matching `org.dxos.type.*`, `org.dxos.skill.*`, `org.dxos.annotation.*`.
  The API is `Operation.make`; `function` was the superseded name, and it is already taken for a
  different concept — `org.dxos.service.function` is the EDGE deployed-function identity.
- The owning root is preserved, so an example or third-party key stays in its own namespace rather
  than being absorbed into `org.dxos`.
- Keys are **full string literals**. The per-plugin `makeKey` helper was removed: it saved a few
  characters and cost the ability to find a key by searching for it.

## Consequences

- 452 keys rewritten; 444 distinct; no collisions remain.
- Three collisions surfaced and were resolved rather than papered over. The markdown pair is the
  instructive one: `Create` persists, attaches and flushes, while `CreateMarkdown` was a pure
  factory returning an unsaved object. Two operations named "create", one of which did not create
  anything. The factory is now `draft`.
- EDGE holds `meta.key` alongside the `functionId` it binds by, so deployed functions must be
  redeployed in the same window (Phase 2).
