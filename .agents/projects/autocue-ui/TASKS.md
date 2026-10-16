# autocue-ui — tasks

## Phase 1: Frame

- [x] Register project; DESIGN.md.
- [x] Scaffold `tools/autocue` (private), storybook glob.
- [x] `Frame` DOM core (`createFrame`), React wrapper, mock autocue story.
- [x] `scripts/inject.mjs`; driver captions render through `Frame`.

## Phase 2: Feed and cursor

- [ ] Move `overlay.mjs`'s feed, cursor and ripple into `Feed` / `Cursor` cores + stories.
- [ ] Load the Countdown through `inject.mjs`.

## Phase 3: Other hosts

- [ ] `terminal/stage.html` title band uses `Frame` (layout mode).
- [ ] `compose.mjs` header/footer bands: render with `Frame` instead of drawtext, or share its tokens.
- [ ] `tools/ident` shares the tokens.
