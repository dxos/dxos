# Plan: normalize the Project–Chat relationship onto the ECHO parent edge

Audit: [`packages/core/compute/compute/src/types/AUDIT.md`](../../../packages/core/compute/compute/src/types/AUDIT.md).

## Goal

One mechanism expresses "this chat belongs to X": `Obj.setParent(chat, subject)`. The
`Chat.CompanionTo` relation is deleted. A chat is then exactly one of:

- **standalone** — no parent; lives in the space's Chats section.
- **companion** — parented to its subject (Markdown doc, table, `Project`, `Agent`, …); appears in
  that subject's companion panel / navtree children.

`Project` gains no `chats` field — enumeration stays a `children()` query, as it is today.

## Why the parent edge

1. Cascade delete: deleting the subject removes its chats; the relation left them orphaned.
2. Always loaded with the object, so `Obj.getParent(chat)` is synchronous — no query round-trip in
   render paths (`peekOutlineRef` already relies on this).
3. `Agent.makeInitialized` already writes both edges to the same target; the relation is redundant.
4. Removes the double-subtraction in `standaloneChatsQuery`.

## What the parent edge does NOT give us

- **Multiple chats per subject.** The parent edge is 1:N subject→chats, same as the relation, so
  `ensure-companion-chat` (`existingChats.at(-1)`) and the toolbar's sibling list still work.
- **Relation payload.** `CompanionTo` carries none beyond `id`, so nothing is lost.
- **An orphan predicate.** Blocking gap — added as `Filter.hasParent` in step 1.

## Steps

Status 2026-08-19: steps 1–7 are implemented on this branch (`Filter.hasParent`, all write/read
sites migrated, `CompanionTo` deleted, tests flipped to parent-edge assertions). Remaining: PR.

### 1. ECHO: `Filter.hasParent` (blocking)

`standaloneChatsQuery` currently subtracts `Project.children()`; with arbitrary parents that no
longer enumerates. Add `Filter.hasParent(boolean)` to `@dxos/echo`, indexed on the parent edge, so
"standalone chat" is expressible directly:

```ts
Query.select(Filter.and(Filter.type(Chat.Chat), Filter.hasParent(false)));
```

Land this first, on its own, before touching any call site. Ship with `echo-host`
query-invalidation coverage for re-index on a parent change — the existing `CompanionTo` note at
`query-invalidation.test.ts:367` is the analogous case and should be updated in the same change.

### 2. Tests first, against today's behavior

Done so far: `Filter.hasParent` landed with unit + e2e + reactivity coverage, and
`assistant-toolkit/src/skills/project/conversation.test.ts` pins the full headless loop (Project ←
parent — Chat, skills/objects bound on the feed, one prompt through `AgentService.getSession`,
assertion on `project.artifacts`) in scripted and live-memoized flavors. The package decision:
`@dxos/assistant-toolkit` is the only core package that has both the Chat/assistant runtime and may
import `Project`; the live-graded evalite variant stays in `assistant-evals` (`projects.eval.ts`).

Extend `Project.test.ts` and `Chat.test.ts` (plus a new `Chat.parent.test.ts` if it grows) to pin
the semantics the migration must preserve:

- a chat parented to a `Project` resolves the project's outline (`ensureOutline`, `peekOutlineRef`);
- a chat parented to a non-`Project` subject owns its own outline;
- `Project.make` parents the task set; deleting the project cascades to task set, instructions,
  chats, and each chat's feed;
- `Agent.loadChat` / `loadForChat` round-trip;
- `standaloneChatsQuery` returns only unparented chats.

Write the last three against the _relation_ first so they are a genuine before/after, then flip the
implementation in step 3 and keep the assertions.

### 3. Migrate the write sites

| File                                                                 | Change                                                                                                     |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `assistant-toolkit/src/types/Agent.ts:180`                           | drop the `Relation.make(CompanionTo, …)`; `[Obj.Parent]: agent` already set                                |
| `assistant-toolkit/src/types/Agent.ts:238-252` `resetChatHistory`    | replace relation retire/create with `Obj.setParent`; the old chat is deleted or re-parented to `undefined` |
| `plugin-assistant/src/operations/fork-chat.ts:88`                    | `Obj.setParent(newChat, companionTo)` instead of `SpaceOperation.AddRelation`                              |
| `plugin-assistant/src/containers/ChatCompanion/ChatCompanion.tsx:44` | same; keep `AddObject` for persistence, drop `AddRelation`                                                 |

### 4. Migrate the read sites

| File                                               | Change                                                                                                                          |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `Agent.ts:90` `loadChat`                           | `Query.select(Filter.id(agent.id)).children()` filtered to `Chat`                                                               |
| `Agent.ts:101` `loadForChat`                       | `Obj.getParent(chat)` + `Obj.instanceOf(Agent, …)` — synchronous, no query                                                      |
| `plugin-assistant/.../app-graph-builder.ts:53`     | `standaloneChatsQuery` becomes `Filter.and(Filter.type(Chat.Chat), Filter.hasParent(false))` — both `Query.without` wrappers go |
| `plugin-assistant/.../ensure-companion-chat.ts:24` | `…children()` filtered to `Chat`, keep `.at(-1)`                                                                                |
| `plugin-assistant/.../useChatToolbarActions.ts:33` | same `children()` query                                                                                                         |

### 5. Surfacing stays as-is

No connector moves. Companion chats on ordinary artifacts are reached through the companion panel
and are deliberately absent from the navtree; the project case is the sole exception, and
`plugin-projects`' `createProjectChatsExtension` (`app-graph-builder.ts:118`) stays where it is.
Its comment needs one edit: ownership is no longer "the parent edge, unlike companions" — it is now
the same mechanism, and what is project-specific is the _display_.

### 6. Delete `CompanionTo`

Remove the class from `Chat.ts` and every registration: `plugin-assistant/schema-defs.ts:19`,
`assistant-toolkit/src/testing/operations.ts:50`, and the eight test `types:` arrays listed in the
audit. No compatibility re-export (AGENTS.md). Grep for `CompanionTo` and confirm the only hits are
the unrelated `app-surface.ts` type parameter and the `query-invalidation.test.ts` comment (update
that comment).

### 7. Existing data: dropped (SHIPPED)

No ECHO migration and no read-side fallback shipped: a fallback would need the relation type it is
falling back to, which step 6 deletes. Pre-launch, `CompanionTo` relations exist only in dev
spaces; their chats revert to standalone (still reachable in the Chats section), and re-opening the
companion panel re-parents on next persist. Decided with the user (pre-launch, no compatibility).

## Verification

Per step: `moon run compute:test`, `moon run assistant-toolkit:test`, `moon run plugin-assistant:test`,
`moon run plugin-projects:test`, `moon run echo:test`, `moon run echo-host:test`. Then the full
`pnpm format` + `moon run :lint` before the PR. Manually confirm in Composer: create a companion
chat on a Markdown doc, fork it, delete the doc (chat must vanish), and confirm the Chats section
lists neither.
