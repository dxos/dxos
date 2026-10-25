# Multi-actor collaboration harness — Tasks

_Resume: Phase 2: a second article (sheet or kanban) on the same harness. Uncommitted: none. Last: first recording (temp/collab/markdown\*.mp4, copied to /Volumes/SSD1/Media/Showcase/collab)._

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

## Phase 3: ECHO design scene

Sixteen actors build the template's ECHO design document from its outline; plan in `ECHO-SCENE.md`.

- [x] **Target document** — `ECHO design` in the DXOS Architecture template: eight chapters, three new ECHO diagrams (`echo-model`, `echo-sync`, `echo-query`) and an `ECHO benchmarks` sheet; template tests updated.
- [x] **Construction plan** — `ECHO-SCENE.md`: outline derived from the target, 16-actor roster, timeline, harness work.
- [ ] **Review** — the user reviews the document and plan.
- [ ] **Harness surfaces** — canvas (`CanvasOperation.Apply`), sheet (`SheetOperation.SetValues`), chat (scripted model), object and cell comments, chapter scroll.
- [ ] **outline/steps from the target** — and a test that playing the steps on the outline reproduces it.
- [ ] **Record** — 8K wall, 16 clips, Grid zoom-out.

## Phase 2: Other articles

- [ ] Generalize `ActorArticle`/`ActorBinding` beyond markdown (an article-specific binding per flow).
- [ ] Canvas, sheet, table, kanban flows on the same harness.
- [x] **Replies and staggering** — `actor.reply(phrase, text)` (AddMessage on the thread anchored on the phrase); the markdown flow staggers Ada and Ben and has Ben answer Dev's threads.
- [x] **16 actors in the Grid** — `flows/team.ts` (8 writers, 4 editors, 4 reviewers, writers answer); `Team` story without name bars rendered at 7680x4320 and cut into 16 1920x1080 clips (`temp/collab/team/`); Grid gains `clipsDir` and `tail`; `tools/autocue/Grid › Collaboration` zooms out from column 2, row 3.
