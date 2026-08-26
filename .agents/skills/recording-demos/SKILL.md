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

It launches Chromium, opens one recording context, and listens on loopback. Every gesture is one HTTP
call, so each is a separate agent turn:

```bash
C() { curl -sS localhost:7333/cmd -d "$1"; echo; }
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

An agent-driven recording is mostly still frames: the browser holds one frame while you decide the
next gesture. The chess run below was **12:52 of which 2:56 was not dead air** — one still stretch ran
34.8 seconds.

```bash
node .agents/skills/recording-demos/scripts/trim-static.mjs --in /tmp/demo/*.webm --out demo.webm
```

It caps each motionless stretch at `--max-static` seconds (default 1.5) and reports what it did:

```json
{
  "frames": { "read": 11591, "kept": 2639 },
  "seconds": { "before": 772.6, "after": 175.9 },
  "reduction": "77%",
  "longestStillRun": "34.8s",
  "cap": "1.5s"
}
```

Frames are compared on a strided sample of the Y plane with a tolerance, because a caret or a spinner
changes a few pixels every frame and an exact comparison finds no still stretches at all. Raise
`--threshold` if slow animations are being treated as motion; lower it if real motion is being cut.

**This needs a full ffmpeg.** The build bundled with Playwright has no `rawvideo`, no PNG decoder and
none of `select`/`concat`/`mpdecimate`, so frames cannot be fed back into it. `apt-get update &&
apt-get install -y ffmpeg`, or point `FFMPEG_PATH` at a real one.

## 5. Send it

Attach the `.webm` (and any stills worth calling out) with `SendUserFile`. Say what was driven, which
steps passed, and what the trim did — a video with no claim attached is not evidence of anything.

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
