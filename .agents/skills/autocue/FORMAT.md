# The autocue format

An autocue bundle is a folder that plays one or more demos in a browser. Each demo is a video with its steps as
chapters on the timeline, the record of where it was recorded, the flow script that drove it, and a prompt that
tells an agent how to record it again. The same folder works in three places:

| Target          | How                                                              | Limit                                         |
| --------------- | ---------------------------------------------------------------- | --------------------------------------------- |
| R2              | `pack.mjs --upload [<slug>]` uploads every file under one prefix | none; public URL to anyone with the link      |
| Claude Artifact | publish `artifact.html` with the `files` map `pack.mjs` prints   | 15 MB per video file; private until shared    |
| Archive         | `pack.mjs --zip`; unzip and open `index.html` from disk          | none; plays offline (fonts fall back locally) |

## Make one

```bash
# Per demo: record, then trim with --mp4. The trimmer writes <name>.autocue.json next to the video.
node .agents/skills/autocue/scripts/trim-static.mjs --in /tmp/demo/session.webm --out /tmp/demo/demo.webm --mp4

# One bundle from one or more demos, in reel order.
node .agents/skills/autocue/scripts/pack.mjs --out /tmp/bundle --title "Sheets" \
  --demo /tmp/demo --demo /tmp/demo-2/demo.autocue.json --zip --upload sheets
```

`--demo` takes a sidecar or a directory that holds one (the newest wins). Other flags:

| flag              | effect                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------- |
| `--title`         | the bundle's name; defaults to the demo's title when there is one demo                       |
| `--formats`       | `mp4` (default) or `mp4,webm`; each extra format doubles the size                            |
| `--zip`           | writes `<out>.zip` (or `<out>.tar.gz` without `zip`), without `artifact.html`                |
| `--upload [slug]` | uploads to the `agent-artifacts` bucket at `autocue/<yyyy-mm-dd>-<slug>/` and prints the URL |
| `--prompt <text>` | replaces the generated agent prompt (one-demo bundles only; else use `@prompt` in the flow)  |
| `--script off`    | leaves the flow script out of the bundle                                                     |
| `--poster off`    | skips the poster frame, which needs ffmpeg                                                   |

`--out` is replaced whole on a re-pack, so a demo dropped from the reel does not linger. A non-empty folder that is
not a bundle is refused.

To publish as an Artifact, pass the printed `artifact.file_path` as `file_path` and `artifact.files` as `files`.
The Artifact's CSP blocks media from other hosts, so the videos must be the Artifact's own files: a video over
15 MB does not fit (`pack.mjs` warns). Trim harder, record at `--scale 1.5`, or send the R2 link instead.

## Layout

```
bundle/
  index.html        the player as a whole document (R2, archive)
  artifact.html     the same player without <html>/<head>, which the Artifact tool adds itself
  autocue.json      the manifest, also inlined in both pages so they work from file://
  <demo-id>/
    video.mp4       (and video.webm with --formats mp4,webm)
    poster.jpg
    flow.mjs        the flow script, when the take ran one
```

All paths in the manifest are relative to the bundle root, so the folder can move as a unit.

## Manifest (`autocue@1`)

```jsonc
{
  "format": "autocue@1",
  "title": "Sheets and chess",
  "created": "2026-10-29T05:45:00.000Z",
  "demos": [
    {
      "id": "plugin-sheet-sales-charts", // the page's #hash for this demo
      "title": "Sales charts",
      "description": "Create the Bramble Coffee Roasters space from its template, …",
      "duration": 52.4, // seconds, bookends included
      "narrated": true, // has a voice-over track
      "videos": [{ "src": "plugin-sheet-sales-charts/video.mp4", "type": "video/mp4" }],
      "poster": "plugin-sheet-sales-charts/poster.jpg",
      "uploaded": "https://assets.composer.space/demos/…", // the trimmer's upload, if any
      "chapters": [{ "at": 1.0, "end": 6.0, "title": "Create the space", "subtitle": "from plugin-sheet/PLUGIN.mdl" }],
      "recording": {
        "recordedAt": "2026-10-29T05:44:38.456Z",
        "target": "browser", // or tauri
        "git": { "branch": "main", "commit": "19e1813…", "dirty": false, "remote": "https://github.com/dxos/dxos" },
        "flow": "packages/plugins/plugin-sheet/autocue/sales-charts.mjs",
        "composer": { "url": "http://localhost:4173", "environment": "local", "version": "0.8.3" },
        "edge": { "url": "https://dev.dxos.network", "environment": "dev" },
        "title": "Sales charts",
        "mdl": "packages/plugins/plugin-sheet/PLUGIN.mdl test QA-3",
        "app": "composer-app via `moon run composer-app:serve -- --port 5180`",
        "template": "Bramble Coffee Roasters", // optional
      },
      "script": { "path": "packages/…/sales-charts.mjs", "file": "plugin-sheet-sales-charts/flow.mjs", "source": "…" },
      "prompt": "Cue the \"Sales charts\" autocue demo and run it end to end. …",
    },
  ],
}
```

## Where each field comes from

- **`chapters`** are the flow's on-camera steps (or `caption` ops), remapped by the trimmer onto the trimmed clock.
- **`recording.git`** is the checkout the flow file is in, or the driver's working directory for a flow in `/tmp`.
  `dirty` means the take ran with uncommitted changes, so the commit alone does not reproduce it.
- **`recording.composer` / `recording.edge`** are read from the running app on `stop`, through the client's
  devtools hook (`__DXOS__.client.config`): `DX_ENVIRONMENT`, the EDGE URL and the build version. The environment
  name is derived from the host when the app does not say (`localhost` is `local`, `dev.dxos.network` is `dev`).
  A storybook take has no client, so it records the page origin only; `DX_EDGE_BASE_URL` in the driver's
  environment fills in the EDGE URL then.
- **`title`, `description`, `mdl`, `app`, `template`, `prompt`** come from the flow's doc comment (SKILL.md, "Flow
  metadata"). The title is `@title`, else the file name (`sales-charts.mjs` is "Sales charts"); the description is
  the prose before the first tag.
- **`prompt`** is generated from the rest when the flow has no `@prompt`: the flow and spec, branch and commit,
  Composer and EDGE, template and serve line, and a pointer to this skill.
- **`script`** is the flow file as it was when packed. For a committed flow it matches `recording.git.commit` only
  if `dirty` is false.

## The player

Keyboard first; `?` in the page lists the keys.

| key                    | action                        |
| ---------------------- | ----------------------------- |
| `Space` `K`            | play / pause                  |
| `S`                    | stop and go back to the start |
| `←` `→`                | previous / next chapter       |
| `1`–`9`                | jump to chapter               |
| `Shift` + `←` `→`      | back / forward 5 s            |
| `[` `]`                | previous / next demo          |
| `<` `>` (`,` `.`), `0` | slower / faster, reset to 1×  |
| `↑` `↓`, `M`           | volume, mute                  |
| `F`                    | fullscreen                    |
| `C`                    | copy the agent prompt         |

The timeline is split into one segment per chapter; hovering names the chapter, clicking seeks. `←` restarts the
current chapter first when the head is more than 1.5 s into it. Speed and volume are remembered per browser. Each
demo has its own `#<id>`, so a link can open the reel on one demo.
