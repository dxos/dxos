---
name: autocue
description: >-
  Record a demo of the running app that the agent drives itself — a `.mdl` QA test or an ad-hoc
  walkthrough — as a captioned `.webm` (or a screenshot), trimmed of dead air and ready to attach.
  Use when asked to demo a feature, show a flow working in the real app, produce a video or
  screenshots of the UI, or execute a flow whose steps have no operation behind them. Also covers
  manual mode, where the user records their own screen while the agent drives a visible browser
  step by step on their cue. "Cue <demo>" (e.g. "cue the projects demo") means run a committed flow
  this way. For a pass/fail report rather than something to watch, use `composer-qa`; for a repeatable
  regression test, write a Playwright spec instead.
---

# Autocue

**"Cue" is the verb.** "Cue the projects demo" means: find the committed flow whose name or doc comment
matches, serve the app its `@app` line names, and list its steps. Cueing never opens the browser or runs.
"Go" then does all the off-camera prep and replies `ready` once the start ring is up; clicking it
runs the take to the end (see "The protocol").

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

## Manual mode: the user records

The user asks for this; never pick it yourself. The user is recording their own screen and is in the
loop at every step. You still drive, and the script is still the `.mdl` test or walkthrough, but the
user decides when each part runs and can change how it runs.

```bash
node .agents/skills/autocue/scripts/driver.mjs --mode manual \
  --port 7333 --url http://localhost:4173 --out /tmp/demo
```

Run it in the background. `--mode manual` changes the driver in five ways:

- **Headed window, no recorder.** The browser opens in the foreground at `--width`×`--height`, and
  the page follows the window, so the user can resize it for their capture. Nothing is encoded, the
  boot is not cut, and §4, §4b and §5 do not apply.
- **The cursor points before it clicks.** Every visible gesture moves the cursor to its target and rests
  there for a second before the ripple and the click, so the person watching sees what is about to be
  chosen. `--dwell <ms>` sets it (default 1000 in manual mode, 0 when recording); a command's own `dwell`
  overrides it. Rely on it rather than adding a `sleep` before each click in a flow; `hud: false` gestures
  (off-camera prep) skip it.
- **Cursor, but no pills and no banners.** The virtual cursor and click ripple still show what is
  being clicked. The action feed and the `caption` banner are suppressed, so they don't compete with
  the product. `--pills on` or `--captions on` brings either back when the user asks.
- **`stop` leaves the browser open.** It answers `ok` and the driver keeps serving. Closing the
  window ends the driver. Never close the browser yourself in this mode unless the user asks.
- **The browser profile persists.** Every manual session opens the same Chromium profile,
  `~/.local/state/dxos/autocue/profile` by default (`--profile <dir>` for another). The
  app's identity, its spaces, and any first-run UI already dismissed carry over, so setup done in
  one session is not redone on camera in the next. Chromium allows one process per profile. If the
  driver exits with `profile … is in use`, the last session's window is still open: close it, or
  keep using it if its driver is still serving. A clean slate means a new `--profile` directory.
  Never delete the default one without asking, since it holds the user's prepared state.
- **A local display is required.** The cloud sandbox has none, so this is for a session on the
  user's machine.

### Drive it from a flow script

In manual mode, write the QA flow as a script and run it, rather than issuing one op per turn. Each op
over HTTP costs a full agent turn, so a ten-step flow driven op by op leaves the user watching dead air
between gestures. A script runs at the app's speed, and you stay the control panel: you choose what to
run, edit the script when the user steers, and read the result.

Check for a committed flow first: one that has already run end to end lives in an `autocue/` folder at the
root of the package it exercises (`packages/apps/composer-app/autocue/`, or a plugin's own), and running it
in place beats rewriting it.

**Otherwise the `.mdl` test comes first, and the script second.** A flow binds a spec; it is not one. The
test carries the intent a reviewer checks — `given`, each step's `do:`/`expect:`, and every product fact the
run surfaces as a `note:` (a known defect it works around, a model that stayed silent). The script carries
only mechanics: selectors, retries, waits, pacing, `setup`. Writing the test from the script instead loses
nothing that matters but duplicates it, and the copy drifts unreviewed. So:

1. Find the test the demo walks, in the `PLUGIN.mdl` of the plugin under test. If there is none, draft a
   `test QA-n` there (the `composer-qa` format) before writing a line of script, and show it to the user
   with the step list.
2. Copy `scripts/flow.example.mjs` to `/tmp/demo/flow.mjs` and write one entry per test step. Each step
   gets `demo`, whose methods take the same arguments as the HTTP ops (so the cursor behaves the same),
   and `page`, the raw Playwright page. Give each step the `do:` text as its `name`, and end it with a
   wait on what `expect:` says should appear, so a step that did nothing fails instead of passing.

```bash
C '{"op":"steps","file":"/tmp/demo/flow.mjs"}'   # numbered step names; `next` is where `run` resumes
C '{"op":"run","until":4}'                         # runs from `next` through step 4, then stops
C '{"op":"run"}'                                   # carries on to the end
C '{"op":"run","from":3,"until":3}'                # re-runs step 3 alone
C '{"op":"abort"}'                                 # stops the run now, mid-step; `next` stays on that step
```

- **`run` re-imports the file every time.** Edit the script and run again; the browser and the
  app's state stay as they are.
- **`from`/`until` take a step number (1-based) or a step name.** With no `from`, `run` resumes where
  the last one stopped. `pace` (default 800 ms in manual mode, `--pace` to change it) is the gap
  between steps.
- **Every step leaves a screenshot**, as `<out>/steps/NN-<name>.png`, whether it passed or failed.
  The reply lists each step with `ok`, the error if it threw, and the screenshot path.
- **On a failure, `run` stops and leaves `next` on the failed step.** Read that step's screenshot
  before changing anything. It shows what the page actually held, which is usually a dialog in
  the way, a collapsed sidebar, or a renamed control. Fix the script, then `run` again to retry
  from that step.
- **Background a long `run`** (`run_in_background`), so the user can interrupt you mid-flow and you
  can send `abort`. Give its request no client timeout (no `curl --max-time`): a timed-out request loses
  the reply, though the run carries on. `status` answers where it is at any time — `state` is `setup`,
  `cued` (play button up), `running`, `done`, `failed` or `aborted`, with the step number and, once it
  ends, the same `result` the `run` reply carries.

### Setup steps and the countdown

Mark off-camera preparation with `setup: true` (enabling a plugin, picking a model). When `run` reaches the
first step after the setup ones it plays a countdown in the page: a closed ring with a play triangle, then a
3-2-1 inside the ring as it unwinds. In manual mode the ring waits for a click, so the user starts their
recorder, clicks it, and the take begins on cue. `"countdown": false` on `run` skips it, `"wait": false` plays
it without the click, and the `countdown` op plays one on demand. It is react-ui-experimental's `Countdown`
(story `ui/react-ui-experimental/Countdown`): its DOM half, `play-countdown.ts`, has no imports, and the overlay
transpiles and injects that same file rather than keeping a copy, so change the look there.

### Browser logs

The driver streams the app's `@dxos/log` output from the page and its dedicated workers to
`<out>/app.log`, in the NDJSON shape `scripts/query-logs.mjs` reads (`--log <file>` to move it, `--log
off` to skip). A bundled app has no `vite-plugin-log` sink, so this is the only log a `vite preview`
session leaves. HTTP responses with an error status are written alongside it under `f: "driver/http"`.
When a step fails for a reason the screen does not explain, such as an agent that never answers, read
this before guessing.

### Restarting from a step

A flow is written to be picked up at any step, not only replayed from the top. A step that changes
app state carries a `done` check next to its `run`. `done` is a quick, read-only test that answers
whether the step's outcome already holds, such as whether the project exists or the plugin is on.

```bash
C '{"op":"run","from":4,"restart":true}'        # reload the app, bring it to step 4 off camera, run 4 on
C '{"op":"run","from":4,"until":4,"replay":true}' # same without the reload, for a page already loaded
```

- **`restart: true` reloads the app,** waits for it to be ready (`--ready`/`--settle`, as for the
  boot), then replays. Use it after the page is wedged, after a driver restart, or when a later
  step needs a clean UI to start from.
- **`replay: true` only replays.** It runs every step before `from` off camera: no cursor, no pills,
  no captions, no pacing. A step whose `done` answers true is skipped, so work already in the
  profile is not redone. The reply lists `replayed` steps as `ok` or `skipped`, and a replay step
  that throws stops the run with its screenshot, like any other failure.
- **Write `done` for every step that creates or changes something.** A step without one is always
  replayed, which is fine for navigation but duplicates a create. Keep `done` read-only and fast:
  `page.evaluate` against app state, or a locator `count()`, never a gesture.
- **The persistent profile is why this matters.** State outlives the session, so the next session
  usually starts partway through a flow. Restarting from the step the user names is what gets them
  back on camera quickly.

Single ops are still the right tool for a one-off correction the user asks for on the spot ("click
that again"), and for probing a failure before you fix the script.

### The protocol

The user's part is two words and one click: "go", then the play button. Everything else is yours.

1. **Cue: stage and wait.** On "cue <demo>" (or when the user asks for a manual recording), find the
   committed flow — or, for a new demo, the `.mdl` test and then the script — and serve the app its
   `@app` line names. List the steps by importing the script with `node` (the driver's `steps` op
   needs a driver, and the browser opens only on "go"). Show the numbered list and wait. Nothing runs yet.
2. **"Go": do all the prep, then reply `ready`.** Start the driver (the browser opens) and `goto`
   if it is not up, then send `run` with no bounds, backgrounded and with no client timeout — it holds
   until the take ends. Poll `status` until `state` is `cued`: every `setup` step has run off camera
   and the play button is up, waiting. Then reply with exactly `ready` and nothing else. If a setup
   step fails instead (`state: failed`), say in one line what failed and fix it; there is no take yet.
3. **Play runs to the end.** The user starts their recorder and clicks play; the flow runs through
   its last step unattended, with no more "go"s. Don't poll on a short interval while it runs — the
   backgrounded `run` returns when the take ends. Then report each step as passed or failed, in a line
   or two.
4. **Take steering as it comes.** "Do step 3 with a longer title", "skip the settings part", or "go
   back and open it again" become an edit to the script (or a `from`/`until`), then another cue.
   "Start again from step 4" is `run` with `from: 4` and `restart: true`. "Run until 4" still works
   for a user who asks to stop partway. A change the user asks for is not a divergence to report.
5. **Handle failures quietly.** Don't narrate passing checks. When a step fails, look at its
   screenshot, say in a line what went wrong and what you'll change, then fix the script. Retry
   only when the user says so, since the retry happens on camera.
6. **Finish with the window open.** Send `stop`, and tell the user the browser is still open and
   that closing it ends the driver.
7. **Commit the flow once it has run end to end.** Save it as `autocue/<name>.mjs` in the package it
   exercises — the plugin under test, or `composer-app` for a flow that spans plugins — and commit it, so
   the next session runs it instead of rediscovering every selector. Commit again whenever a later
   session fixes it.

### Flow metadata

Every committed flow opens with a doc comment that says where it came from and what it needs, so a
reader can tell whether it is still in step with its spec:

```js
/**
 * Start a chess game and play the opening.
 *
 * @mdl packages/plugins/plugin-chess/PLUGIN.mdl test QA-1
 * @app composer-app via `moon run composer-app:serve` on :5173
 */
```

- **`@mdl`** names the `.mdl` file and the `test` (or `flow`) the steps were written from. It is
  required: a flow with no test behind it is a spec nobody reviews, so write the test first.
- **`@app`** says how to serve the app the flow runs against, including any build flags and
  environment it depends on.
- Name each step after its `do:` text, so the flow and the spec can be read side by side.

## 1. Get the app running

```bash
DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:serve -- --port 4173
```

**`VITE_DX_DISABLE_ANIMATIONS=true` is not optional here.** It turns off animation that runs without
a user gesture — the tour's carousel auto-advancing every 10s is the one that bites — and unattended
motion defeats §4 entirely: every frame differs from the last, so the trimmer finds no still runs to
cull and a 13-minute session stays 13 minutes. Check it took effect the same way §4 does, from
`--report`: a session that sat idle should be almost all `stillSeconds`.

Wait for `ready in`. In the cloud sandbox, first read the `cloud-sandbox` skill — the dev server
needs a full dependency build (`moon run composer-app:build`), and Chromium needs the proxy flags
that `driver.mjs` already applies.

### Storybook, when the demo is a component

```bash
DX_STORIES=plugins/plugin-assistant,stories/stories-assistant VITE_DX_DISABLE_ANIMATIONS=true \
  moon run storybook-react:serve
```

`DX_STORIES` narrows which packages are crawled (see `.storybook/main.ts`); unset it and the whole
monorepo is served from source, which is slower to boot and re-optimizes mid-session. The `serve`
task builds the full package closure first, so budget the same 10+ minutes as an app.

**Always record storybook demos in isolation mode.** Drive
`/iframe.html?id=<story-id>&viewMode=story` — the story fills the 1728×1080 frame, and the recording
carries the component instead of a sidebar, a Controls table and a toolbar that mean nothing to the
person watching. The manager is worth one establishing shot at most; it is never where the feature
gets demonstrated.

```bash
C '{"op":"goto","url":"http://localhost:9009/iframe.html?id=plugins-plugin-assistant-components-chatactivity--sequence&viewMode=story"}'
```

The id is the CSF path: `title` lowercased with every `/` and space turned into `-`, then `--`, then
the export name in kebab-case (`ConnectingMcp` → `connecting-mcp`). Read it off the manager's URL if
in doubt.

Four things about storybook that cost a cycle each:

- **Warm the preview bundle before the first isolation load.** A cold `iframe.html` pays the whole
  Vite dep-scan and holds a light-theme spinner for 15s+ — which lands in the recording. Load the
  manager once, wait for the story to render, and only then drive `iframe.html`.
- **`eval` runs in the manager, not the story.** `page.evaluate` sees the top document, so a story
  selector resolves to nothing. Reach in explicitly:
  `document.querySelector('#storybook-preview-iframe').contentDocument.querySelector(...)`. Same for
  `click`/`text` — a Playwright locator does not cross into the iframe.
- **HMR is your edit loop.** A source edit re-renders the live story in about 4s, so verify a fix by
  re-reading the DOM rather than restarting anything.
- **Remount by re-selecting, not reloading.** A story with a timer or an animation restarts when it
  mounts; clicking another story and back is instant, whereas a reload re-bundles.
- **Scope a selector that the thread also matches.** A chat's composer and every message already in
  the thread are all `.cm-content`, so the bare selector's `.first()` types into the transcript —
  silently, since the op still answers `ok`. Anchor on the container's testid
  (`[data-testid="assistant.prompt"] .cm-content`) and read the value back before submitting.
- **`clearCaption` before touching anything at the bottom of the page.** The banner is pinned there,
  so it sits over a composer or a footer toolbar and swallows the click. Clear it, interact, caption
  again.

### The native desktop app (Tauri)

The same driver drives the desktop app with `--target tauri`: every op, the overlay, captions, cuts, flow
scripts and the trimmer work unchanged. Playwright cannot attach to a WebKitGTK or WKWebView webview, so the
driver speaks W3C WebDriver instead. `scripts/tauri/page.mjs` is a Playwright-shaped `page` over that session
and `scripts/tauri/selectors.mjs` evaluates Playwright's selector syntax in the page (`>>`, `nth=`, `text=`,
`role=…[name=…]`, `:visible`, `:has-text()`, `:text-is()`, `:has()`), so a flow written for Chromium runs as
is. What it does not have: open shadow roots are not pierced, the log tap misses entries logged before the
first drain, and there is no `page.on('console' | 'response')`.
Restart the driver after editing `scripts/tauri/*`: the adapter loads once. Flow scripts reload per `run`.

#### macOS

macOS has no WebDriver for WKWebView, so the app serves one itself. A build with the `webdriver` cargo feature
embeds `tauri-plugin-wdio-webdriver`, which listens on loopback at `TAURI_WEBDRIVER_PORT` (the driver passes
`--driver-port`, 4444). Release builds never enable the feature.

```bash
export DX_TAURI=true DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true   # plus DX_EDGE_BASE_URL for EDGE preview
moon run composer-app:tauri-build-test     # bundle, sidecars, then `tauri build --no-bundle`
node .agents/skills/autocue/scripts/driver.mjs --target tauri --fresh on --out /tmp/demo
```

- **The test build has its own identity.** `tauri-build-test` applies `src-tauri/tauri.test.conf.json`:
  identifier `org.dxos.composer.test`, its own asset-server port (26781, the `Test` channel in
  `src-tauri/src/channel.rs`) and its own WebKit data store. Nothing it does touches an installed Composer's
  profile, and it runs beside one. Never run a `webdriver` build under a shipped identifier: the app asserts
  the test identifier at startup, and the launcher refuses a binary without it.
- **`--fresh on` is a first-run take.** It deletes the test profile before launch:
  `~/Library/WebKit/app/WebsiteDataStore/6175746f-…-000000000001` (web storage),
  `~/Library/Application Support/org.dxos.composer.test` (window state, last URL) and
  `~/Library/Caches/org.dxos.composer.test`. Without it, identity, spaces and plugin toggles carry over.
- **The window is real and on screen.** It opens wherever macOS puts it and is resized to `--width`x`--height`.
  It does not need focus, so keep working; just don't click into it mid-take.
- **The recorder takes webview snapshots** (`takeSnapshot` through WebDriver, about 50 ms each at the
  display's 2x), held and repeated to a steady `--fps`, then transcoded like the Linux capture. A screen grab
  would need the Screen Recording permission, which an agent cannot grant itself. No window chrome is in
  the frame, and the frame rate of motion is roughly 10 per second, which is enough for UI.
- **Input is dispatched in the page** (`scripts/tauri/input.mjs`). The plugin's own `/actions` send only bare
  `mousedown`/`mouseup`/`click` and keys with no default action, so a zag menu ignores a click outside it and
  CodeMirror takes no text. The adapter instead sends the full pointer sequence (`pointerover`…`click`, with
  focus moved on press) and keys with their defaults (`execCommand('insertText')`, delete, caret moves, Tab
  focus, Enter submits). The events are untrusted: native HTML5 drag and drop does not start, and anything
  gated on `isTrusted` (fullscreen, clipboard reads) is out of reach.
- **Native dialogs cannot be driven.** Set what a folder or file picker would return through app state with
  an `eval`, the same way the browser flows stand in for Tauri IPC.
- **The updater stays off.** The test port is not in `TAURI_LOCALHOST_PORTS`, so the app treats itself as a dev
  server and never updates into a shipped build.
- **Xcode 27 needs a debug Swift build for the passkey plugin.** Its release configuration makes the
  `swift-rs` symbols the bridge exports local, and the link fails; `tauri-build-test` passes
  `--config profile.release.package.tauri-plugin-macos-passkey.debug=1`, which flips `swift-rs` to
  `swift build -c debug`. Pass the same to a hand-run `cargo build --release`.
- The app's own log goes to `<out>/native.log`; the page's log to `<out>/app.log`, as in the browser.

#### Linux (and the cloud sandbox)

`tauri-driver` hands the session to `WebKitWebDriver`, whose pointer and key actions arrive in the page as
**trusted** platform events (menus open, CodeMirror takes typed text). Windows would work through
`msedgedriver` but is untested.

One-time setup:

```bash
apt-get install -y libwebkit2gtk-4.1-dev webkit2gtk-driver xvfb ffmpeg bubblewrap socat
cargo install tauri-driver --locked
node .agents/skills/autocue/scripts/tauri/smoke.mjs   # the adapter against stock MiniBrowser, ~5s
```

Build the app — a release build, and with `custom-protocol`: a bare `cargo build` leaves Tauri in `cfg(dev)`,
which embeds no frontend and serves blank pages. The frontend is `out/composer`, so bundle it first:

```bash
DX_ENVIRONMENT=dev DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:bundle
moon run composer-app:stage-sandbox-helper        # dx-sandbox beside the binary, for local sandboxes
(cd packages/apps/composer-app/src-tauri && cargo build --release --features tauri/custom-protocol)
node .agents/skills/autocue/scripts/driver.mjs --target tauri --out /tmp/demo
```

- **The app boots where it always does**, its channel's `http://localhost:<port>`, so `goto` with no `url`
  waits for the ready plank and cuts the boot without navigating; `restart` reloads that origin.
- **With no `DISPLAY` the app gets its own Xvfb screen** sized to the window in device pixels (`--width`,
  `--height`, `--scale`), and `scripts/tauri/recorder.mjs` grabs it with ffmpeg: H.264 while recording, VP9
  once on `stop`, from the last `cut`. `--headed on` uses your `$DISPLAY` instead.
- **`--theme` works through GTK** (`GTK_THEME=Adwaita:dark`), and the cloud sandbox's proxy through GLib's
  `https_proxy`, which the launcher sets; WebKit needs neither of Chromium's TLS flags.
- **The app keeps a profile** (`~/.local/share/org.dxos.composer`), like manual mode's Chromium profile: its
  identity and spaces carry over between runs. Delete that directory for a first-run take.
- `--app <binary>` drives another build; `--driver-port` moves tauri-driver off 4444.
- **Bundle with `VITE_DX_STORAGE=memory` for Linux.** WebKitGTK cannot hand a worker an OPFS sync access
  handle (its file-handle IPC is Cocoa-only), so Composer's SQLite store cannot open there and the app stops
  at a System Error. The app switches the needed WebKit features on itself (`src-tauri/src/webkit_features.rs`),
  but the handle is not a feature. With the memory store every launch — and every reload — is a new identity;
  only localStorage (plugin settings, layout) persists, so a flow that reloads re-selects the first space.
- **Nothing on Xvfb may disable the DMA-BUF renderer.** `WEBKIT_DISABLE_DMABUF_RENDERER=1` makes the app
  segfault in `AcceleratedBackingStore::update` on the first composited frame; the launcher sets
  `LIBGL_ALWAYS_SOFTWARE=1` instead. For a crash, run the app under `gdb` via a wrapper passed as `--app`,
  with `libwebkit2gtk-4.1-0-dbgsym` from `ddebs.ubuntu.com` for symbols.

## 2. Start the driver

```bash
node .agents/skills/autocue/scripts/driver.mjs \
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

Ops: `goto` `cut` `click` `fill` `type` `press` `keys` `hover` `drag` `waitFor` `text` `count` `eval` `invoke`
`caption` `clearCaption` `sleep` `screenshot` `run` `steps` `status` `abort` `stop`. In manual mode `stop` leaves the browser open, and `run` executes a flow script (see "Drive it from a flow script"). `invoke` takes `key`, `input` and an optional
`spaceId`, and runs the operation through `composer.invoke`. `selector` takes any Playwright selector; `text` selects
by visible text instead. Every op answers `{ok:true,...}` or `{ok:false,error}` and never kills the
driver.

`press` also puts the chord in the action feed (`⌘ ⇧ K`), so a recording of a shortcut shows what was
pressed — pass `"hud": false` to suppress it, or `keys` to show a chord for a gesture the driver did
not perform. The chip is the proof; without it a palette just appears. See "The action overlay" below.

### The boot is cut by default

App boot is almost never what a demo is about, and it is the longest stretch of motion in a session, so
the trimmer cannot remove it. The first `goto` therefore waits for the app to be ready — `--ready`,
by default a Composer plank or a rendered storybook story (not the sidebar, which renders ~8s before any content) — lets it settle for `--settle` ms, and
discards everything recorded before that. Its reply says what happened: `"boot":{"cut":true}`, or
`cut:false` with the reason (the selector never appeared within `--ready-timeout`, or the 1x fallback,
which cannot drop frames).

- **Keep it when it matters** — a demo about startup, a splash, or a slow boot — with `--boot keep`.
- **`cut` at any point** drops everything recorded so far, for setup you would rather not show (seeding
  a space, enabling a plugin). Captions issued before it are dropped too, so caption after the cut.
- **For another app**, pass a selector whose first match is the element that means "ready", e.g.
  `--ready '[data-testid=app]'`; the driver waits for that first match to become visible.

**`stop` is not optional.** The recording is written on context close; a driver killed with the video
un-stopped leaves nothing behind.

### Resolution

With a full ffmpeg on the path (see §4 — the trimmer needs one anyway) the page renders at 2x device
pixels and the driver encodes the session itself: `page.screencast` frames go to disk as they arrive and
are encoded once, on `stop`, to VP9 at constant quality (`session.webm`, 3456x2160 for the default
viewport). Without one it falls back to Playwright's `recordVideo` at 1x and says so at startup — that
encoder is a fixed 1 Mbit realtime VP8, so asking it for a bigger frame only smears the same bits wider.

| flag               | default         | effect                                                                                                                            |
| ------------------ | --------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `--scale`          | `2`             | device pixel ratio; `1.5` → 2592x1620, `1` for the smallest file                                                                  |
| `--width`          | `1728`          | CSS viewport (with `--height 1080`); sets the layout, not sharpness — `1280`/`800` for a small-laptop look                        |
| `--crf`            | `28`            | VP9 quality, lower is better and larger                                                                                           |
| `--fps`            | `25`            | cap on frames kept during motion; still stretches cost one frame whatever this is                                                 |
| `--quality`        | `92`            | JPEG quality of the screencast frames                                                                                             |
| `--theme`          | `dark`          | emulated `prefers-color-scheme`; `light` for a light recording                                                                    |
| `--action-timeout` | `5000`          | ms a gesture (or a flow script's raw locator) waits for its target; a wrong selector fails fast                                   |
| `--cadence`        | `600`           | least ms between two on-camera gestures, the pause a person takes to find the next control; `cadence` on one command overrides it |
| `--log`            | `<out>/app.log` | NDJSON of the app's `@dxos/log` output (page and dedicated workers); `off` to skip                                                |

**`deviceScaleFactor` alone does not make the video 2x.** The page renders at 2x (`devicePixelRatio`
reads 2, screenshots are sharp), but Chromium's screencast still captures at CSS size, so the frames
arrive at 1728x1080 and the encoder upscales them — a "3456x2160" file that is as soft as 1x. The driver
also launches Chromium with `--force-device-scale-factor`, which makes the frames themselves 2x. Check a
recording by cropping a frame at 1:1 next to a `screenshot` of the same screen; they should match.

The recording is variable-frame-rate — Chromium only emits a frame when something paints — so `stop`
encodes in time proportional to the motion, not the session length. The trimmer resamples on decode and
re-encodes with the same VP9 settings (`--crf`, default 30), so the resolution survives trimming.

### The action overlay

Every gesture is painted into the page as it happens, so the video shows causes as well as effects:

- **Clicks** — a cursor glides to the target and a ripple marks the point, a beat before the click lands.
  `drag` moves the cursor along the path.
- **Keys** — `press` and `keys` show the chord (`⌘ ⇧ K`); `type`/`fill` show the text going in.
- **`eval`** — the snippet's first 240 characters, resolved with ✓ or ✗ and the error line.
- **Operations** — `composer.invoke` is wrapped in the page, so an operation gets its own entry (key,
  input, ✓/✗) whether it came from the `invoke` op or from inside an `eval` snippet.

Entries stack in a feed in the top-right and fade after 3.5s. Most planks keep their toolbar there, so
move the feed when the demo's subject lives in that corner (`--feed bottom-left`, or any corner), and
`--overlay off` drops it. Pass `"hud": false` on a single command to keep a setup probe off camera, and
`"label"` to name a click target the way a viewer would. The overlay sits in a `pointer-events: none`
shadow root, so neither Playwright's actionability checks nor the app's hit testing see it.

## 3. Caption every step

`caption` pins a banner to the bottom of the page, so the video explains itself with no editing:

```bash
C '{"op":"caption","value":"Step 2 — Play 1. e4: drag the e2 pawn to e4","subtitle":"from plugin-chess/PLUGIN.mdl"}'
```

When running a `.mdl` test, the caption is the step's `do:` text verbatim and the subtitle is where it
came from. A viewer then sees the spec and the app agreeing, which is the whole point of the artifact.

## 4. Trim the dead air

An agent-driven recording is almost entirely still frames: the browser holds one frame while you decide
the next gesture — provided nothing on the page animates on its own, which is why §1 sets
`VITE_DX_DISABLE_ANIMATIONS=true`. Measure before tuning — `--report` costs one decode and no encode:

```bash
node .agents/skills/autocue/scripts/trim-static.mjs --in /tmp/demo/*.webm --report
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
node .agents/skills/autocue/scripts/trim-static.mjs \
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

### For a phone: `--mp4`

iOS does not play VP9 or WebM from a file share, so a demo someone will watch on an iPhone needs an
H.264 copy. `--mp4` writes `<name>.mp4` next to the trimmed WebM, video only — iOS players reject the
chapter and WebVTT tracks rather than ignoring them, so those stay in the WebM. It costs one more encode,
which is why it is opt-in.

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

## Running a `.mdl` test this way

Read the test first (`composer-qa` §1 applies unchanged: `given`, `before`/`steps`/`after`, and
every `note` is a constraint, not commentary). Then, per step, perform the `do:` rather than the
`invoke:`, and judge `expect:` from the screen.

Consent is the same as `composer-qa`: a test mutates by definition, so name the test and what it
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
- **A narrow window collapses the navtree.** Its items are in the DOM but never "visible and stable";
  click the visible `button:visible:has-text("Open sidebar")` first. A flow can't assume the window
  size — the user resizes it for their capture.
- **The privacy toast has no testid.** `li[role="status"]:has-text("Privacy Notice") button:has-text("Close")`.

## Where the spec and the app disagreed

Recording chess QA-1 surfaced two divergences from its `do:` text. Both are the spec drifting behind
the UI, not defects — report them, do not silently work around them:

1. Step 1 says "click + on a collection and choose Chess". The picker now offers **Game** (type
   `org.dxos.type.game`), then a **variant** step where Chess is chosen, and only then a name field.
2. The created game lands under **Database → Games**, grouped by type — not as a row under the
   collection the `+` was clicked on, which is what `expect:` describes.
