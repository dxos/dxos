# The autocue format

An autocue bundle is a folder that plays one or more demos in a browser. Each demo is a video with its steps as
chapters on the timeline, the `.mdl` test it was recorded from, the record of where it was recorded, the committed
flow that drove it, and a prompt that tells an agent how to record it again. The same folder works in three places:

| Target          | How                                                                          | Limit                                      |
| --------------- | ---------------------------------------------------------------------------- | ------------------------------------------ |
| dx.pub          | `pack.mjs --upload [<slug>]`; shared as `https://dx.pub/demo/<date>-<slug>/` | none; public to anyone with the link       |
| Claude Artifact | publish `artifact.html` with the `files` map `pack.mjs` prints               | 15 MB per video file; private until shared |
| Archive         | `pack.mjs --zip`; unzip and open `index.html` from disk                      | none; plays offline                        |

**Share the dx.pub link.** It is the bucket's `autocue/` prefix, served by the edge router's `/demo` route on the dx.pub apex. Until that
route answers, `pack.mjs` says so and prints the same bundle's r2.dev URL instead (`--host r2` asks for it outright).

## Only committed flows are packed

A bundle is for other people, so everything it names has to be something they can check out. `pack.mjs` refuses a
demo unless its flow is:

- inside the repository, as `packages/<package>/autocue/<name>.mjs` (the flow store [DEMOS.md](DEMOS.md) indexes);
- committed at the commit the take recorded; and
- unchanged since that commit (the take ran the file on disk).

A take of `/tmp/demo/flow.mjs` is a rehearsal. Commit the flow, record again from that commit, then pack. A commit
that is on no remote branch is packed with a warning: push it before sharing the link, or the checkout in the prompt
fails.

## Make one

```bash
# Per demo: record (driver.mjs, `run` with the committed flow), then trim with --mp4. The trimmer writes
# <name>.autocue.json next to the video.
node .agents/skills/autocue/scripts/trim-static.mjs --in /tmp/demo/session.webm --out /tmp/demo/demo.webm --mp4

# One bundle from one or more demos, in reel order.
node .agents/skills/autocue/scripts/pack.mjs --out /tmp/bundle --title "Chess" --demo /tmp/demo --upload chess
```

`--demo` takes a sidecar or a directory that holds one (the newest wins). Other flags:

| flag              | effect                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------- |
| `--title`         | the bundle's name; defaults to the demo's title when there is one demo                      |
| `--upload [slug]` | uploads to the `agent-artifacts` bucket at `autocue/<yyyy-mm-dd>-<slug>/`, archive included |
| `--host`          | `dx.pub` (default) or `r2`: the address the upload is checked against and printed           |
| `--zip`           | writes `<out>.zip`, and a copy inside the bundle for the player's Bundle download           |
| `--formats`       | `mp4` (default) or `mp4,webm`; each extra format doubles the size                           |
| `--prompt <text>` | replaces the generated agent prompt (one-demo bundles only; else use `@prompt` in the flow) |
| `--script off`    | leaves the flow's source out of the bundle                                                  |
| `--poster off`    | skips the poster frame, which needs ffmpeg                                                  |
| `--rebuild`       | rebuilds the player page even when its build is newer than its sources                      |

`--out` is replaced whole on a re-pack, so a demo dropped from the reel does not linger. A non-empty folder that is
not a bundle is refused.

To publish as an Artifact, pass the printed `artifact.file_path` as `file_path` and `artifact.files` as `files`.
The Artifact's CSP blocks media from other hosts, so the videos must be the Artifact's own files: a video over
15 MB does not fit (`pack.mjs` warns). An Artifact also cannot start a download, so its Video and Bundle buttons
open the hosted copy; pack with `--upload` first, or the Artifact shows no Bundle button.

## The player

The page is a small React app in `tools/autocue/player`, built from `@dxos/react-ui` (Panel, ScrollArea, Listbox,
Toolbar, ToggleGroup, Tabs, Card, Dialog, Slider, Tag) and the DXOS theme, with the components in
`tools/autocue/src/player` (storybook: `tools/autocue/Player`). `pack.mjs` builds it with one Vite build, a few
seconds, into a single `index.html` that holds its script, styles and the few icons it uses, then writes the manifest
into it. Change the page there, never in a bundle.

The page is laid out as a Composer plank: the video, its timeline and transport on the left, and a companion panel on
the right whose tabs are the demo's data. Drag the panel's edge to resize it.

- **Chapters** (the default tab) lists the steps; click one, or use `←`/`→` and `1`–`9`. Before the first step the
  **Intro** row is current.
- **Spec** shows the `.mdl` test as source. Each recorded step is a block that seeks to its chapter on a click, the
  step under the playhead is highlighted, and the same keys step through it. Steps the take did not record (`after`,
  human-only steps) stay as text.
- **Recording** is where the take was made: branch and commit, Composer and EDGE environments, flow, spec, serve
  line, date and audio. The header's info button opens it.
- **Prompt** is the text to copy to an agent to record the demo again; **Script** is the flow's source.
- The transport has play, stop, previous and next chapter, a speed menu (0.5× to 4×), volume and mute, fullscreen,
  and **Video** and **Bundle** downloads.

| key                    | action                                 |
| ---------------------- | -------------------------------------- |
| `Space` `K`            | play / pause                           |
| `S`                    | stop and go back to the start          |
| `←` `→`                | previous / next chapter (or spec step) |
| `1`–`9`                | jump to chapter                        |
| `Shift` + `←` `→`      | back / forward 5 s                     |
| `[` `]`                | previous / next demo                   |
| `<` `>` (`,` `.`), `0` | slower / faster, reset to 1×           |
| `↑` `↓`, `M`           | volume, mute                           |
| `F`                    | fullscreen                             |
| `V`                    | next side panel tab                    |
| `C`                    | copy the agent prompt                  |
| `?`                    | the list of keys                       |

`←` restarts the current chapter first when the head is more than 1.5 s into it. Speed, volume, the side panel's
tab and its width are remembered per browser. Each demo has its own `#<id>`, so a link can open the reel on one demo.

## Layout

```
bundle/
  index.html        the player with the manifest written in (dx.pub, archive)
  artifact.html     the same without the document shell, which the Artifact tool adds itself
  autocue.json      the manifest, also inlined in both pages so they work from file://
  <slug>.zip        the whole bundle, for the Bundle download (with --zip or --upload)
  <demo-id>/
    video.mp4       (and video.webm with --formats mp4,webm)
    poster.jpg
    flow.mjs        the committed flow at the recorded commit
```

All paths in the manifest are relative to the bundle root, so the folder can move as a unit.

## Manifest (`autocue@1`)

The types are `tools/autocue/src/player/types.ts`.

```jsonc
{
  "format": "autocue@1",
  "title": "Chess",
  "created": "2026-10-29T05:45:00.000Z",
  "archive": "chess.zip", // the Bundle download
  "hosted": "https://dx.pub/demo/2026-10-29-chess/", // artifact.html only: where its downloads point
  "demos": [
    {
      "id": "plugin-chess-play-the-opening", // the page's #hash for this demo
      "title": "Play the opening",
      "description": "Start a chess game, play the opening by dragging pieces, …",
      "duration": 52.4, // seconds, bookends included
      "narrated": true, // has a voice-over track
      "videos": [{ "src": "plugin-chess-play-the-opening/video.mp4", "type": "video/mp4" }],
      "poster": "plugin-chess-play-the-opening/poster.jpg",
      "chapters": [{ "at": 1.0, "end": 6.0, "title": "Create the game", "subtitle": "from plugin-chess/PLUGIN.mdl" }],
      "recording": {
        "recordedAt": "2026-10-29T05:44:38.456Z",
        "target": "browser", // or tauri
        "git": { "branch": "main", "commit": "19e1813…", "dirty": false, "remote": "https://github.com/dxos/dxos" },
        "flow": "packages/plugins/plugin-chess/autocue/play-the-opening.mjs",
        "composer": { "url": "http://localhost:4173", "environment": "local", "version": "0.8.3" },
        "edge": { "url": "https://dev.dxos.network", "environment": "dev" },
        "mdl": "packages/plugins/plugin-chess/PLUGIN.mdl test QA-1",
        "app": "composer-app via `moon run composer-app:serve -- --port 4173`",
        "template": "Chess Club", // optional
      },
      "spec": {
        "path": "packages/plugins/plugin-chess/PLUGIN.mdl",
        "test": "QA-1",
        "line": 120, // the file line of lines[0]
        "lines": ["test QA-1: Start a game and play the opening", "…"],
        "steps": [{ "name": "Play 1. e4", "start": 18, "end": 22, "chapter": 1 }],
      },
      "script": {
        "path": "packages/…/play-the-opening.mjs",
        "file": "plugin-chess-play-the-opening/flow.mjs",
        "source": "…",
      },
      "prompt": "Check out `main` at commit `19e1813…` of https://github.com/dxos/dxos (…).\n\nThen cue …",
    },
  ],
}
```

## Where each field comes from

- **`chapters`** are the flow's on-camera steps (or `caption` ops), remapped by the trimmer onto the trimmed clock.
- **`recording.git`** is the checkout the flow is in. `dirty` means other files had uncommitted changes when the
  take ran; the flow itself cannot, or `pack.mjs` would have refused it.
- **`recording.composer` / `recording.edge`** are read from the running app on `stop`, through the client's
  devtools hook (`__DXOS__.client.config`): `DX_ENVIRONMENT`, the EDGE URL and the build version. The environment
  name is derived from the host when the app does not say (`localhost` is `local`, `dev.dxos.network` is `dev`).
  A storybook take has no client, so it records the page origin only; `DX_EDGE_BASE_URL` in the driver's
  environment fills in the EDGE URL then.
- **`title`, `description`, `mdl`, `app`, `template`, `prompt`** come from the flow's doc comment (SKILL.md, "Flow
  metadata"). The title is `@title`, else the file name (`sales-charts.mjs` is "Sales charts"); the description is
  the prose before the first tag.
- **`spec`** is the `@mdl` test, read from git at the recorded commit. A step is tied to the chapter whose title is
  its `name` or its `do:` text, which is why flows name their steps after the spec's.
- **`script`** is the flow's source at the recorded commit.
- **`prompt`** opens with the checkout of the recorded branch and commit, then names the flow, spec, Composer and
  EDGE environments, template and serve line, and points at this skill. A flow's `@prompt` replaces it.
