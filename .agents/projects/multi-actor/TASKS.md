# Multi-actor collaboration harness — Tasks

_Resume: Phase 2 — a second article (sheet or kanban) on the same harness. Uncommitted: none. Last: first recording (temp/collab/markdown\*.mp4, copied to /Volumes/SSD1/Media/Showcase/collab)._

## Phase 1: Markdown prototype

Four actors compose and edit one new markdown document; the story renders frame by frame and is cut
into one clip per actor.

### Tasks

- [x] **Design** — `DESIGN.md`.
- [x] **Harness** — `withActors` + `Scene`: a client per actor, identities with name + hue, a shared space, real invitations, an all-joined signal, a plugin manager per actor.
- [x] **Clock + flow runner** — `VirtualClock` (tracks, settle-before-advance), `ActorFlow`, `runFlow`.
- [x] **Actor API** — `type`, `moveTo`, `select`, `replace`, `comment`, `waitFor`, `pause` over the actor's EditorView.
- [x] **Presence** — selection published without focus; steady caret in the actor's hue; idle carets hidden.
- [x] **Stage** — N-cell grid with name bars; `window.grid` seek contract in stepped mode; `window.actorScene` for debugging.
- [x] **Markdown story** — `Collaboration.stories.tsx` (`Markdown`) + `flows/markdown.ts`; play test checks convergence.
- [x] **ECHO fix** — `RefImpl` equality includes resolver + target, so in-page clients no longer share one `refFamily` atom (every editor was bound to client 0's Text).
- [x] **Comment replication fixes** — `ui-editor` comments retry an anchor whose cursor cites edits not yet received; `plugin-review` comment sync re-reads anchors when a thread arrives after its anchor.
- [x] **Stepped play test** — `TestMarkdown` seeks the scene to the end and checks every actor converges with all three comments.
- [x] **Record** — `render.mjs --story stories-stories-agent-collaboration--markdown` (27s, 60 fps, 2x supersample), cropped to four 960x540 clips.

## Phase 2: Other articles

- [ ] Generalize `ActorArticle`/`ActorBinding` beyond markdown (an article-specific binding per flow).
- [ ] Canvas, sheet, table, kanban flows on the same harness.
- [ ] Assemble the clips in the autocue Grid.
- [ ] Render the per-actor clips at 1920x1080 directly (a one-cell stage per actor) instead of cropping quadrants.
