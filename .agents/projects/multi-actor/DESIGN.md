# Multi-actor collaboration harness — Design

## Goal

Show several people (distinct HALO identities) editing one object at the same time, each in their own
copy of the real plugin article, and record it frame by frame for the autocue showcase grid. The first
scenario is a markdown document written by four actors; later scenarios swap the article for canvas,
sheet, table, kanban, and so on.

## Shape

```
stories-agent/src/testing/actors/
  harness.tsx     withActors(): N in-memory clients, one shared space, real invitations, a plugin manager per client
  clock.ts        VirtualClock: async sleep() resolved by advance(); drives every actor's timing
  actor.ts        Actor API over one client's EditorView (type, moveTo, select, replace, comment, pause)
  flow.ts         ActorFlow type + runFlow(): steps per actor, sequential per actor, parallel across actors
  stage.tsx       ActorStage: 2x2 (or N) frame, actor name bars; installs window.grid in stepped mode
stories-agent/src/stories/
  Collaboration.stories.tsx   Markdown story: four actors compose and edit a new document
  flows/markdown.ts           The script
```

### Clients, space, invitations

- One `TestBuilder` per story; `createLocalClientServices()` per actor; memory signalling and transport,
  so all clients live in one page with no network.
- Each actor's client gets its identity with `initializeIdentity` (display name + `data.hue`, so carets
  and comment authors are named and coloured consistently between runs).
- Actor 0 creates a dedicated space and seeds the document; the others join it with
  `performInvitation` (the real invitation protocol). A `ready` trigger resolves once every actor has
  the space **and** the document has replicated to it — the missing "all joined" callback that
  `withMultiClientProvider` leaves as a TODO.
- Each actor renders inside its own `ClientPluginManager` (Markdown, Review, Space, Core plugins), so
  the article, comments highlight layer and awareness carets are the app's own code paths.

### Flow syntax

The autocue flow syntax is `export const steps = [{ name, run: async ({ demo }) => … }]`. The actor flow
keeps that shape and adds one field, `actor`, naming who performs the step:

```ts
export const flow: ActorFlow = {
  actors: [{ name: 'Ada', hue: 'blue' }, …],
  document: { name: 'Launch notes', content: '# Launch notes\n\n## Overview\n\n## Details\n' },
  steps: [
    { actor: 0, name: 'Overview', run: async ({ actor }) => { await actor.moveTo({ after: '## Overview\n' }); await actor.type('…'); } },
    { actor: 1, name: 'Details', run: async ({ actor }) => { … } },
  ],
};
```

Steps of the same actor run in order; different actors run concurrently. Steps cannot be the autocue
driver's own (those are Playwright closures that cannot run in a page), so the actor API is a
browser-side counterpart of `demo.*`.

### Time

Every wait in the actor API (`type` per character, `pause`) goes through a `VirtualClock`. In real-time
mode a rAF loop advances it with wall time. In stepped mode the story installs the same
`window.grid = { total, seek }` contract the Grid uses, so `tools/autocue/showcase/render.mjs` renders it
unchanged: `seek(ms)` advances the clock (resolving sleepers in time order), then waits until every
actor's document text is identical (replication settled) and two animation frames have painted. Seeks
only move forward, which is what render.mjs does.

### Edits

- Typing dispatches CodeMirror transactions on the actor's own `EditorView` (from
  `MarkdownCapabilities.EditorViews`), with `userEvent: 'input.type'`, so the caret moves and remote
  carets update through awareness.
- Positions are by text match (`after`, `before`, `select: 'phrase'`), resolved against the actor's
  current document, so concurrent inserts by others never invalidate a script.
- Comments use `CommentOperation.Create` with `range` and `text` on the actor's own operation invoker,
  so the thread is authored by that actor and the highlight replicates to everyone.

### Recording

`render.mjs --story stories-stories-agent-collaboration--markdown` renders the 2x2 stage to one MP4;
`ffmpeg crop` cuts it into one clip per actor (each a 16:9 quadrant) for Grid cells.

## Decisions

- **Own decorator instead of `withMultiClientProvider`.** It needs per-actor identity, a dedicated
  shared space, an all-joined signal and a 2x2 layout; adding all four to the shared helper would bend
  it for one caller. Revisit once a second scenario needs the same.
- **Harness lives in stories-agent.** The user asked for it there; it moves to `storybook-testing` when
  a second package needs it.
- **Generic names** (Ada, Ben, Cleo, Dev) with fixed hues, configurable per flow.
- **Highlights are comment highlights.** Markdown has no highlight syntax; actor 4's "highlight then
  comment" is the comment range highlight, which is also what reviewers see.
- **Window contract reused (`window.grid`).** render.mjs hard-codes it; reusing it keeps render.mjs
  unchanged.
- **Comments anchor by editor cursors, not offsets.** `CommentOperation.Create`'s `range` is checked
  against the stored text, which can lag the actor's view by a replication round; the actor passes
  `Cursor.getCursorFromRange` on its current selection as `anchor` instead.
- **Presence without focus.** Only one editor on a page can be focused and awareness publishes only
  while focused, so the harness contributes an extension (via `MarkdownCapabilities.ExtensionProvider`)
  that publishes the selection itself and draws a steady caret in the actor's hue.
- **Fixed in ECHO, not worked around.** `RefImpl`'s Effect `Equal` compared URIs only, so the global
  `refFamily` atom cache gave every in-page client the first client's ref and all four editors bound
  to one `Text`. Equality now includes resolver and target (hash stays URI-only). The story is a
  regression check: an edit in one actor's editor reaches the others only by replication.
- **Real-time playback runs on a timer, and React may detach the scene.** rAF is suspended in a hidden
  tab, and StrictMode unmounts and remounts the decorator; `Scene.open()` resumes playback and
  reinstalls `window.grid`.
- **Sixteen actors render as one 8K wall, then cut.** One stepped pass at 7680x4320 gives every actor a native
  1920x1080 quadrant on the same scene timeline (16 separate passes would replay the scene 16 times); the Grid
  then reads the cut clips from `temp/collab/team/` through its `clipsDir` prop, and its `tail` holds the
  revealed wall with every clip playing on.
