# autocue-ui — tasks

## Phase 1: Frame

- [x] Register project; DESIGN.md.
- [x] Scaffold `tools/autocue` (private), storybook glob.
- [x] `Frame` DOM core (`createFrame`), React wrapper, mock autocue story.
- [x] `scripts/inject.mjs`; driver captions render through `Frame`.
- [x] Fixed-height caption; band or panel header/caption; panels invert the theme; caption panel translucent.
- [x] `size`: lay out at the recording size and scale to fit (aspect ratio kept).
- [x] Intro: header held as a centred panel, then cross-faded; driver `title` op.

## Phase 2: Feed and cursor

- [ ] Move `overlay.mjs`'s feed, cursor and ripple into `Feed` / `Cursor` cores + stories.
- [x] Load the Countdown through `inject.mjs`.

## Phase 3: Other hosts

- [ ] `driver-persist.local.mjs` still paints its own caption banner; move it to `updateFrame`.
- [ ] `terminal/stage.html` title band uses `Frame` (layout mode).
- [ ] `compose.mjs` header/footer bands: render with `Frame` instead of drawtext, or share its tokens.
- [x] Merge `tools/ident` into `tools/autocue` (`src/ident/`); `--ident` renders at the recording's aspect ratio.
- [ ] The ident shares the Frame tokens.
