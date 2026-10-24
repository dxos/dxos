# Multi-actor collaboration harness — Tasks

_Resume: build the prototype. Uncommitted: none. Last: design written._

## Phase 1: Markdown prototype

Four actors compose and edit one new markdown document; the story renders frame by frame and is cut
into one clip per actor.

### Tasks

- [x] **Design** — `DESIGN.md`.
- [ ] **Harness** — `withActors`: clients, identities, shared space, invitations, ready signal, plugin manager per actor.
- [ ] **Clock + flow runner** — `VirtualClock`, `ActorFlow`, `runFlow`.
- [ ] **Actor API** — type, moveTo, select, replace, comment, pause over the actor's EditorView.
- [ ] **Stage** — 2x2 layout with name bars; `window.grid` in stepped mode.
- [ ] **Markdown story** — `Collaboration.stories.tsx` + `flows/markdown.ts`.
- [ ] **Record** — render.mjs to MP4, crop to four clips.

## Phase 2: Other articles

- [ ] Canvas, sheet, table, kanban flows on the same harness.
- [ ] Assemble the clips in the autocue Grid.
