---
name: recording-demos
description: >-
  Record a demo of the running app that the agent drives itself — a `.mdl` QA flow or an ad-hoc
  walkthrough — as a captioned `.webm` (or a screenshot), trimmed of dead air and ready to attach.
  Use when asked to demo a feature, show a flow working in the real app, produce a video or
  screenshots of the UI, or execute a flow whose steps have no operation behind them. For a
  pass/fail report rather than something to watch, use `running-qa-flows`; for a repeatable
  regression test, write a Playwright spec instead.
---

# Recording demos

The agent drives the real app one gesture at a time and the session is recorded. Three things make
this different from a Playwright spec, and they are the reasons to reach for it:

- **The next gesture can depend on what the last one rendered.** A spec fixes every step up front.
- **Steps with no operation behind them are performable.** `plugin-chess` QA-1 step 1 has no
  `invoke:` at all — `[op:startGame]` has no runtime counterpart, and enabling the plugin is a UI
  action that `manager.enable()` from the debug port does not do. A spec cannot execute that flow;
  this can.
- **A failure is a finding, not a crash.** A failed gesture returns an error and the browser stays
  open, so the next probe can ask why.

It is _not_ a test. Nothing here belongs in CI: there are no assertions, and the output is for a
human to watch. When you want a regression test, write a spec — see `browser-e2e-tests`.

Not to be confused with `packages/apps/composer-app/demos/`, which arranges several headed windows in
a grid on a real desktop for a human to drive via `robotjs` (its own TODO calls that abandoned). It
records nothing and exposes no control channel, so it cannot serve an agent or produce an artifact.

## Decide what to produce first

**A screenshot is often enough, and always cheaper.** Reach for one when the thing being shown is a
state rather than a sequence: a layout or styling change, a fixed empty state, a form's validation
message, a before/after pair. A video earns its size only when the _motion_ is the point — a drag, a
transition, a streaming response, a multi-step flow where order matters. The driver takes screenshots
with the same `screenshot` op, so this is a choice about what to send, not a different setup.

When in doubt, record the session anyway (it costs nothing extra while you are driving) and send only
the stills if the video adds nothing.

## 1. Get the app running

```bash
DX_PWA=false moon run composer-app:serve -- --port 4173
```

Wait for `ready in`. In the cloud sandbox, first read the `cloud-sandbox` skill — the dev server
needs a full dependency build (`moon run composer-app:build`), and Chromium needs the proxy flags
that `driver.mjs` already applies.

## 2. Start the driver

```bash
node .agents/skills/recording-demos/scripts/driver.mjs \
  --port 7333 --url http://localhost:4173 --out /tmp/demo &
```

It launches Chromium, opens one recording context, and listens on loopback behind a per-process token
(printed at startup and written to `<out>/token`). Loopback alone is not access control — any page the
browser has open can POST here cross-origin in `no-cors` mode, and the command would run even though the
response is opaque to it; a token in a non-safelisted header cannot be set by such a request. Every
gesture is one HTTP call, so each is a separate agent turn:

```bash
C() { curl -sS -H "x-demo-token: $(cat /tmp/demo/token)" localhost:7333/cmd -d "$1"; echo; }
C '{"op":"goto"}'
C '{"op":"click","selector":"[data-testid=\"treeView.pluginRegistry\"]"}'
C '{"op":"screenshot","name":"01-registry.png"}'
C '{"op":"stop"}'          # closes the context — this is what writes the video
```

Ops: `goto` `click` `fill` `type` `press` `hover` `drag` `waitFor` `text` `count` `eval` `caption`
`clearCaption` `sleep` `screenshot` `stop`. `selector` takes any Playwright selector; `text` selects
by visible text instead. Every op answers `{ok:true,...}` or `{ok:false,error}` and never kills the
driver.

**`stop` is not optional.** The recording is written on context close; a driver killed with the video
un-stopped leaves nothing behind.

## 3. Caption every step

`caption` pins a banner to the bottom of the page, so the video explains itself with no editing:

```bash
C '{"op":"caption","value":"Step 2 — Play 1. e4: drag the e2 pawn to e4","subtitle":"from plugin-chess/PLUGIN.mdl"}'
```

When running a `.mdl` flow, the caption is the step's `do:` text verbatim and the subtitle is where it
came from. A viewer then sees the spec and the app agreeing, which is the whole point of the artifact.

## 4. Trim the dead air

An agent-driven recording is almost entirely still frames: the browser holds one frame while you decide
the next gesture. Measure before tuning — `--report` costs one decode and no encode:

```bash
node .agents/skills/recording-demos/scripts/trim-static.mjs --in /tmp/demo/*.webm --report
```

```json
{
  "frames": 11591,
  "motionFrames": 254,
  "motionSeconds": 16.9,
  "stillRuns": 135,
  "stillSeconds": 755.8,
  "longestStillRun": 34.8,
  "atCap": { "0.5s": 76.6, "1s": 130.1, "1.5s": 179 }
}
```

Read that as: **16.9 seconds of motion in 12:52**, split by 135 separate pauses. The cap, not the
content, decides the length — 135 pauses × 1.5s is ~3 minutes on its own. `atCap` prices each choice
before you spend an encode on it.

```bash
node .agents/skills/recording-demos/scripts/trim-static.mjs \
  --in /tmp/demo/*.webm --out demo.webm --max-static 0.5 --caption-hold 2.5
```

Two caps, because the hold budget should be spent where information appears: `--caption-hold` for a
pause that begins just after a step caption went up (the one the viewer has to read), `--max-static`
for every other pause. Uniform capping buys length without readability.

### Tuning the motion metric

Frames are compared on a strided sample of the Y plane, counting samples that changed by more than
`--delta` and calling it motion past `--threshold` (a _fraction_ of samples, default 0.002).

**Do not average the difference over the frame.** That was the first implementation and it silently
trimmed the chess drags: a piece crossing two squares is ~0.7% of a 1280×800 frame, which averages
down into the same range as a blinking caret. The symptom is subtle — the video still looks plausible,
but gestures are missing and `motionSeconds` is implausibly low (it read 4.5s for a run containing four
drags; the fraction metric found 8.3s). If drags look clipped, check `--report` first.

Raise `--threshold` if a spinner or animation is being counted as motion; lower it if real gestures are
being cut.

**A full ffmpeg is required.** The build bundled with Playwright is stripped — no `rawvideo`, no PNG
decoder, none of `select`/`concat`/`mpdecimate` — so frames cannot be fed back into it at all.
`apt-get update && apt-get install -y ffmpeg`, or point `FFMPEG_PATH` at a real one. (In the cloud
sandbox `apt-get update` first: the preinstalled index is stale and the install 404s without it.)

## 4b. Step titles as real annotations

`.webm` carries time-ranged annotations, and the trimmer writes both from the driver's `timeline.json`
— so the steps survive outside the burned-in banner:

- **Matroska chapters** — titles with start/end times, navigable in mpv, VLC and mkvtoolnix.
- **An embedded WebVTT track** (`Stream #0:1: Subtitle: webvtt`), which is part of the WebM spec, and
  carries the caption's subtitle line too.

Both are verified by reading the output back:

```bash
ffmpeg -hide_banner -i demo.annotated.webm 2>&1 | grep -E "Chapter #|title|Subtitle"
```

The trimmer remaps each caption's timestamp through the frames it dropped, so the annotations line up
with the trimmed timeline rather than the original one. A `.vtt` sidecar is written next to the video
for players that want it separately.

**One caption per step, and let the step finish first.** Two captions issued back to back map to the
same output frame, which becomes a zero-length chapter that players discard silently — the trimmer
collapses those (keeping the later one, per `--min-chapter`), but the step title is then lost from the
list. Caption the step, perform it, verify it, then caption the next.

## 5. Send it

`SendUserFile` with the `.webm` and any stills worth calling out. Say what was driven, which steps
passed, and what the trim did — a video with no claim attached is not evidence of anything.

`SendUserFile` reaches the human in this conversation and nobody else. When a reviewer on GitHub has to
see it too, publish it as well — see [[hosting-artifacts]] and §5b.

The trimmer also writes a self-contained `<name>.html` viewer: the video plus a clickable step list
that seeks. That is for local review — browsers implement neither half of what is muxed into the file
(no browser has a chapter UI for Matroska, and `<video>` populates `textTracks` only from `<track>`
elements in the page, never from an in-container WebVTT track), so a page is the only way to click
through steps in a browser. It is **not** a route into a PR.

## 5b. Attaching a demo to a PR

**Publish the artifact; do not commit it.** [[hosting-artifacts]] puts a `.webm`, a still, or a
contact sheet in the shared `agent-artifacts` R2 bucket, verifies it over the public URL, and prints the
link to paste here — one command, no commit, and it works in the cloud sandbox. Prefer it over both of
the git-based tricks below, which remain documented because the pinned-URL one is still the only way to
get an image that lives in the repo's own history.

**A still can be embedded; a video cannot.** Use the SHA-pinned hosting technique from
[[composer-ui]] ("Hosting"): commit the PNG, take
`https://raw.githubusercontent.com/dxos/dxos/<full-sha>/<path>` from that commit, embed it, then delete
the file in the next commit. `refs/pull/<n>/head` keeps serving the blob, so the URL survives both the
delete and the branch being deleted at merge, and the PR's final diff carries no binaries. Verify with
`curl -o /dev/null -w '%{http_code}'` after the deleting commit lands.

**Never commit the video.** A multi-megabyte blob does not belong in git, and the retention that makes
the pinned-URL trick work also means you cannot take it back. Commit a contact sheet instead — nine
frames at the chapter starts, tiled, is ~330 KB and shows the whole flow:

```bash
i=0; for t in 7.5 14.0 22.5 30.6 31.6 34.4 35.3 38.6 43.2; do i=$((i+1));
  ffmpeg -loglevel error -ss $t -i demo.webm -frames:v 1 -vf scale=426:-1 -y sheet/$(printf %02d $i).png; done
ffmpeg -loglevel error -framerate 1 -i 'sheet/%02d.png' \
  -vf 'tile=3x3:margin=8:padding=6:color=0x111111' -frames:v 1 -y contact-sheet.png
```

Pick times just _after_ each chapter start so the frame lands past the transition, and check the result
— adjacent chapters often render the same screen, and a duplicate panel wastes a ninth of the sheet.

What survives this session's API proxy, measured rather than assumed:

| in a PR body                                                           | survives                                                                               |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `![x](https://raw.githubusercontent.com/…)`                            | **yes** — GitHub-hosted absolute URLs keep the `!`                                     |
| `![x](relative/path.png)`                                              | no — the `!` is stripped, leaving a link                                               |
| `<video src>`, `<source>`, `<track>`, `<img src>`                      | no — escaped by the proxy, and stripped by GitHub even when written with `--body-file` |
| `[x](github.com/user-attachments/assets/…)` alone in its own paragraph | a player — but only a human can create that URL; see [[hosting-artifacts]]             |
| bare URL, `[text](url)`                                                | yes, verbatim                                                                          |

`<video>` never survives — the proxy escapes it and GitHub's sanitiser strips it besides — and the
attachment upload that does yield a player is a web-UI endpoint: `POST /upload/policies/assets` needs a
browser CSRF token and answers `422`/`403` to a PAT. So a player is reachable, but only through a human.

Upload the video per [[hosting-artifacts]] and link it with its **duration and size** in the link text.
That is the convention — a labelled R2 link for the video, an R2 image embed for the stills. A player
needs a human drag-and-drop to mint a GitHub attachment; it is deliberately not part of the flow, and the
measured reasons not to chase it are in [[hosting-artifacts]].

### Before/after, when the demo is a fix

For a change to rendered output, a pair of stills beats a clip: see [[composer-ui]]
("Before/after screenshots") — both states from **one build** (re-apply the old value in the live page
rather than rebuilding `main`), with `getBoundingClientRect()` / `getComputedStyle` numbers printed
beside them. The driver's `eval` op does the measuring; `screenshot` takes the pair. A video of a layout
fix mostly proves the app still runs.

## 6. Watch the demo before shipping it

Play it back, or step the frames, before attaching. Two different classes of problem only show up here:

- **The recording is wrong.** Gestures clipped by an over-aggressive motion threshold, a caption that
  covers the thing it describes, a step whose outcome never appears. Fix the recording.
- **The app is wrong.** A demo is the first time anyone _watches_ the feature rather than asserting on
  it, and it surfaces what tests do not: a flash of an empty state, a spinner that outlives its work, a
  layout that jumps, an interaction that needs two attempts. **If the demo reveals a defect in
  something you built earlier in this session, fix it now** — do not ship a video that documents your
  own bug and say nothing. Re-record after the fix; the recording is cheap and the credibility is not.

## Running a `.mdl` flow this way

Read the flow first (`running-qa-flows` §1 applies unchanged: `given`, `before`/`test`/`after`, and
every `note` is a constraint, not commentary). Then, per step, perform the `do:` rather than the
`invoke:`, and judge `expect:` from the screen.

Consent is the same as `running-qa-flows`: a flow mutates by definition, so name the flow and what it
will change before starting, and run it against a dev server you started, never the user's profile.

Verify state by reading the DOM, not by trusting the gesture:

```bash
# Board occupancy, derived from geometry — no testids exist on the squares.
C '{"op":"eval","expr":"(()=>{const b=[...document.querySelectorAll(\"div\")].filter(d=>d.children.length===64&&d.getBoundingClientRect().height>100)[0];const r=b.getBoundingClientRect(),sq=r.width/8;return [...document.querySelectorAll(\"svg\")].map(s=>{const q=s.getBoundingClientRect();if(q.width<20)return null;const f=Math.floor((q.x+q.width/2-r.x)/sq),k=8-Math.floor((q.y+q.height/2-r.y)/sq);return f>=0&&f<8&&k>=1&&k<=8?String.fromCharCode(97+f)+k:null}).filter(Boolean).sort().join(\" \")})()"}'
```

A step whose `expect:` is a refusal (chess QA-1 step 5) passes when the state is **unchanged** —
assert that explicitly, or a gesture that silently did nothing reads as a pass.

## Hard-won specifics

These cost a cycle each; none is guessable from the source.

- **Escape selector values, don't escape ids.** `#org.dxos.plugin.chess-input` needs CSS escaping that
  does not survive shell + JSON quoting. Use `input[id="org.dxos.plugin.chess-input"]`.
- **`input[type="text"]` matches the attribute, not the property.** Composer's inputs often carry no
  `type` attribute, so that selector finds nothing even though `el.type === 'text'`. Target
  `placeholder` — and copy it verbatim: it is `Filter…` with a real ellipsis, not `Filter...`.
- **A stepped drag, never `dragTo`.** The board's drop targets are pragmatic-drag-and-drop, which arms
  its zones off observed movement; the `drag` op moves in ~25 increments for that reason. `dragTo` and
  a single synthetic jump both land on a `canDrop` that never fired.
- **Drag needs a big enough board.** The same drag that worked on the full plank did nothing on the
  small card in the Games list. If a drag silently fails, open the object into its own plank first.
- **Locators that resolve but never become "visible and stable" usually mean a collapsed sidebar.**
  Clicking `spacePlugin.space` toggles it. Reopen it before blaming the selector.
- **Clicking the account avatar navigates away.** `clientPlugin.account` opens the profile pane, and
  `Back to Space` in the sidebar does not return; click `spacePlugin.space` instead.
- **The privacy toast has no testid.** `li[role="status"]:has-text("Privacy Notice") button:has-text("Close")`.

## Where the spec and the app disagreed

Recording chess QA-1 surfaced two divergences from its `do:` text. Both are the spec drifting behind
the UI, not defects — report them, do not silently work around them:

1. Step 1 says "click + on a collection and choose Chess". The picker now offers **Game** (type
   `org.dxos.type.game`), then a **variant** step where Chess is chosen, and only then a name field.
2. The created game lands under **Database → Games**, grouped by type — not as a row under the
   collection the `+` was clicked on, which is what `expect:` describes.
