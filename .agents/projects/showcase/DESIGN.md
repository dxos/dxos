# Showcase — Design

A short video that sells Composer by showing many plugins at once: it opens on one demo, tours a few at full frame,
then pulls back to a grid of every plugin running. The recording rules live in
`tools/autocue/showcase/docs/SHOWCASE.md`; this file records why it is built the way it is.

## Decisions

- **The montage is a storybook story, not a video editor.** It lives in `tools/autocue` with the rest of the
  showcase tooling, since it reads the tooling's `temp/grid-zoom`; react-ui-canvas only supplies the camera maths.
  `Grid` lays clips out as tiles and drives one camera
  with `react-ui-canvas`'s camera math, so the motion is code we can iterate on.
- **The camera path is a pure function.** `interpolateCamera` returns the camera at any `t`, so the same frame always
  renders the same view. Pans between tour cells are straight slides at constant zoom; only the final pull-back uses
  the zoom-out path.
- **The composite is rendered frame by frame.** A live screencast of the story delivers about 25 fps at 1080p, which
  made the camera judder. The story's stepped mode seeks the camera and every visible clip to an exact time, and
  `render.mjs` screenshots each frame into ffmpeg at 60 fps.
- **Clips are autocue flows against the real app, not storybook stories.** Each plugin clip creates its object in
  Composer and performs one gesture; committed flows are cut by their step times.
- **Headless with the GPU.** The default headless shell renders WebGL in software, which starved 3D plugins and
  timed the take out; `--gpu on` launches full Chromium's headless mode instead.
- **Clips record at 2x, encode at 1080p, keep the navtree.** A tour cell fills the frame, so it must be 1:1, and the
  app chrome shows it is Composer.

## Limits

- Tiles' own motion runs at the screencast rate (about 25 fps); only the camera is frame-exact. Rendering the whole
  montage in Remotion would frame-lock the clips too.
