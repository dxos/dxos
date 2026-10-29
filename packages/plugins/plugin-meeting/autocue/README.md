# Four-person meeting video

How the QA-2 recordings (`PLUGIN.mdl`) are made: Alien Labs scopes the Cairn dashboard on a four-person call.
Astrid (the local user) joins late and waves. Lucía leads and shares the DXOS Architecture "Plugin metrics" sheet.
The transcript fills in beside the call. Every participant is a video file played through plugin-calls'
simulated participants, so nothing needs a camera, EDGE or the Cloudflare media server.

| File                                                                                  | Role                                                                    |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [`fieldstone-dashboard.conversation.json`](fieldstone-dashboard.conversation.json)    | Cast, voices, motion prompts, Higgsfield prompts, script and timing.    |
| [`plugin-metrics-screenshare.mjs`](plugin-metrics-screenshare.mjs)                    | Records the screen Lucía shares.                                        |
| [`four-person-call.mjs`](four-person-call.mjs)                                        | Records the call in Composer, with the live transcript (QA-2).          |
| [`plugin-calls/autocue/simulated-call.mjs`](../../plugin-calls/autocue/simulated-call.mjs) | Records the `SimulatedCall` story.                                  |
| [`autocue/scripts/heygen.mjs`](../../../../.agents/skills/autocue/scripts/heygen.mjs) | HeyGen avatars, line clips and whole-track takes.                       |
| [`autocue/scripts/conversation.mjs`](../../../../.agents/skills/autocue/scripts/conversation.mjs) | Cuts the clips into one track per participant.              |
| [`autocue/scripts/align.py`](../../../../.agents/skills/autocue/scripts/align.py)     | Warps a clip onto a participant's still, so cuts do not jump.           |

Paths below use `temp/meeting` (gitignored): `/tmp` does not survive a restart, and the renders cost money.
Each script's doc comment has its full options.

## 1. Faces: Higgsfield stills

Each participant's `higgsfield` entry in the conversation file holds the prompts that made their `image`:

1. `cast`: a `soul_cast` character, 16:9.
2. `scene`: a `gpt_image_2_5` webcam frame (high quality, 2k, 16:9) with the character as `image_references`.

Astrid has no `cast`, because her `scene` prompt generates her directly. The rules that came out of review:
everyone is in an office, faces the monitor's webcam at eye level, wears formal clothes and glasses, and has
nothing (no laptop, no keyboard) between them and the camera.

Put each still's URL in `image`, and save a 1280×720 copy as `<clips>/still-<id>.png` for `align.py`.

## 2. Avatars and line clips: HeyGen

```bash
set -a; . .secrets/heygen.env; set +a
node .agents/skills/autocue/scripts/heygen.mjs --conversation packages/plugins/plugin-meeting/autocue/fieldstone-dashboard.conversation.json --out temp/meeting --cast-only
node .agents/skills/autocue/scripts/heygen.mjs --conversation packages/plugins/plugin-meeting/autocue/fieldstone-dashboard.conversation.json --out temp/meeting
```

The first command makes a photo avatar from each `image` and stops, so the faces can be checked in
`temp/meeting/cast/` before any video is paid for. The second renders one Avatar IV clip per line into
`temp/meeting/clips/`: spoken lines with the speaker's `voiceId`, and silent gestures (the waves and the nod) from
their `motion` and `seconds`. Clips that already exist are not rendered again.

## 3. One continuous take per speaker

A track stitched from line clips jumps at every cut. Each speaker therefore gets one HeyGen take, lip-synced to
their whole track, which replaces the stitching:

```bash
node .agents/skills/autocue/scripts/conversation.mjs --conversation packages/plugins/plugin-meeting/autocue/fieldstone-dashboard.conversation.json --clips temp/meeting/clips --out temp/meeting/speech --audio
node .agents/skills/autocue/scripts/heygen.mjs --conversation packages/plugins/plugin-meeting/autocue/fieldstone-dashboard.conversation.json --out temp/meeting --takes temp/meeting/speech
```

`--audio` writes each speaker's voice, placed exactly as in the final track, to `<id>.wav`. `--takes` renders
`clips/take-<id>.mp4` from it, with low expressiveness and a motion prompt that has the speaker look down and type
notes while silent. Lip-sync from Higgsfield (Seedance with `audio_references`) looked theatrical, which is why the
takes come from HeyGen. The three takes cost about $13.

## 4. The listener: Astrid

Astrid never speaks, so she has no take. Her track is her HeyGen wave (`clips/00-astrid.mp4`) followed by one
listening clip, `clips/listen-astrid-0.mp4`. That clip is two 26 s Higgsfield `seedance_2_5` clips (`omni_reference`,
720p, no audio, her still as both `start_image` and `end_image`, the two `higgsfield.listening` prompts), joined
with ffmpeg's concat demuxer. `conversation.mjs --plan` lists the gap it must fill.

The two models frame her about 2% differently, so align both clips to her still before cutting:

```bash
uv run .agents/skills/autocue/scripts/align.py temp/meeting/clips/still-astrid.png 00-astrid.raw.mp4 temp/meeting/clips/00-astrid.mp4
uv run .agents/skills/autocue/scripts/align.py temp/meeting/clips/still-astrid.png listen-astrid-0.raw.mp4 temp/meeting/clips/listen-astrid-0.mp4
```

## 5. The shared screen

Start Composer from this worktree (see the flow's `@app` line), then record and trim:

```bash
node .agents/skills/autocue/scripts/driver.mjs --url http://localhost:4173 --out temp/meeting/screenshare --theme light --captions off --overlay off --width 1600 --height 1000
node .agents/skills/autocue/scripts/trim-static.mjs --in temp/meeting/screenshare/session.webm --out temp/meeting/screenshare/demo.webm --theme light
```

Run `plugin-metrics-screenshare.mjs` through the driver (`{"op":"run","file":…}`) between the two commands. It
creates a DXOS Architecture space, opens Plugin metrics, then opens the chart, clears "Horizontal bars" and saves.

## 6. Tracks

```bash
node .agents/skills/autocue/scripts/conversation.mjs --conversation packages/plugins/plugin-meeting/autocue/fieldstone-dashboard.conversation.json --clips temp/meeting/clips --out temp/meeting/tracks --screenshare lucia=temp/meeting/screenshare/demo.webm
```

This writes `<id>.webm` per participant, `lucia-screen.webm` (from `participants.lucia.screenshare.at`, its last
frame held to the end), `conversation.wav` and `timeline.json`. The story reads the tracks from storybook's static
directory, which `.git/info/exclude` keeps out of git:

```bash
mkdir -p tools/storybook-react/static/simulated-call
cp temp/meeting/tracks/*.webm temp/meeting/tracks/timeline.json tools/storybook-react/static/simulated-call/
```

## 7. Takes

Record both in light mode, without captions, at scale 1, with autoplay allowed. `MEETING_TRACKS` points the
flows at the tracks:

```bash
MEETING_TRACKS=$PWD/temp/meeting/tracks node .agents/skills/autocue/scripts/driver.mjs --scale 1 --theme light --captions off --out temp/meeting/take --url http://localhost:4173 --chromium-args --autoplay-policy=no-user-gesture-required
MEETING_TRACKS=$PWD/temp/meeting/tracks node .agents/skills/autocue/scripts/driver.mjs --scale 1 --theme light --captions off --out temp/meeting/story --url 'http://localhost:9009/iframe.html?id=plugins-plugin-calls-components-simulatedcall--default&viewMode=story' --chromium-args --autoplay-policy=no-user-gesture-required
```

Run `four-person-call.mjs` on the first (after a `goto`) and `simulated-call.mjs` on the second, then stop each
driver and trim with `trim-static.mjs` as in step 5. The call's moving video keeps the trimmer from cutting
anything after the join, so the audio stays in step.

## 8. Sound

The recordings have no sound. Lay `conversation.wav` under each, delayed by the first spoken line's caption time
in the trimmed `.vtt` minus that line's `start` in `timeline.json` (3.6 s):

```bash
ffmpeg -i demo.webm -i temp/meeting/tracks/conversation.wav -filter_complex "[1]adelay=<ms>:all=1,apad[a]" -map 0:v -map "[a]" -shortest -c:v copy -c:a libopus demo.voiced.webm
ffmpeg -i demo.voiced.webm -vf "scale=1280:-2,fps=25" -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart demo-1280.mp4
```

To check the result, `silencedetect` on the mp4 should put the first speech onset within about 0.2 s of the
first line's caption.
