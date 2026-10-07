# Two people, side by side

How to record a Composer demo where two people (Alice and Bob), each with their own identity, work in one
shared space, and the video shows both screens next to each other.

```bash
# From packages/apps/composer-app: the e2e bundle (EDGE signaling, PWA off), served on 127.0.0.1.
VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:bundle-e2e
pnpm exec vite preview --configLoader native --host 127.0.0.1 --port 4173 --strictPort &

# From the repo root.
node .agents/skills/autocue/scripts/pair.mjs \
  --flow packages/apps/composer-app/autocue/two-peer-collaboration.mjs --out /tmp/pair --mp4 on
```

The run writes `alice.webm`, `bob.webm`, `timeline.json` (pane offsets, captions, step results), one
screenshot per peer per step under `steps/`, and the result: `side-by-side.webm` (plus `.mp4` and a `.vtt`
of the step captions).

## How it works

`pair.mjs` launches one Chromium and opens **one browser context per person**. A context has its own
cookies, localStorage, IndexedDB and OPFS, so each boots Composer as a new device with a new HALO identity.
This is what `composer-e2e`'s `collaboration.spec.ts` and `messenger-demo.spec.ts` already do with
`AppManager`.

- **Each page is recorded on its own** by `recorder.mjs`, the same 2x VP9 screencast recorder `driver.mjs`
  uses, and carries `overlay.mjs`'s cursor and click ripple.
- **The boot and the `setup: true` steps are cut.** When the first on-camera step starts, every recorder
  is cut at the same instant, so frame `t` of each pane shows the same wall-clock moment. Any skew left
  between the calls goes into `timeline.json` as `offsetMs` and `compose.mjs` pads it out.
- **`compose.mjs` tiles the panes** with ffmpeg: it labels each pane in a header band, holds a pane that
  ends early on its last frame, and burns each step's caption across the full width in a footer band. A
  caption drawn inside one page would cover only that pane.
- **Codes travel through the console, not the screen.** The app logs `invitationCode` and `authCode` as
  JSON, so `alice.nextConsoleValue('invitationCode')` hands Alice's code to Bob, as `AppManager` does.

### Writing a flow

A flow exports `steps`, like a `driver.mjs` flow, but each step receives every peer:

```js
export const steps = [
  {
    name: 'Clear first-run chrome',
    setup: true,
    run: async ({ peers }) => {
      /* off camera */
    },
  },
  {
    name: 'Alice types; Bob sees it arrive', // Also the step's caption.
    subtitle: 'QA-8 step 3',
    run: async ({ peers: { alice, bob } }) => {
      await alice.click(alice.page.getByTestId('…')); // Cursor glides, rests, ripples, then clicks.
      await alice.type('Hello'); // A character at a time, so it replicates on camera.
      // End on what `expect:` says, so a step that did nothing fails.
    },
  },
];
```

Peers are keyed by lowercased name (`--peers Alice,Bob,Carol` gives three panes). `caption(title,
subtitle)` adds a caption mid-step; `caption: false` on a step suppresses its automatic one. A failing step
stops the run, but the videos up to that point are still written and composed, which shows where it went
wrong.

Re-compose without re-recording (other labels, an MP4 copy):

```bash
node .agents/skills/autocue/scripts/compose.mjs --in /tmp/pair/alice.webm --in /tmp/pair/bob.webm \
  --timeline /tmp/pair/timeline.json --out /tmp/pair/again.webm --mp4 on
```

## Why this approach

Three ways were considered.

| Approach                                                                    | Verdict                                                                                                                                                                                          |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A. One script, one context per person, record each, compose with ffmpeg** | **Chosen.** Real isolation per person, full resolution per pane, one shared clock, and gestures can depend on what the other peer just rendered.                                                 |
| B. One page tiling two iframes, recorded as one video                       | Not viable as a default. Same-origin iframes share storage, so both panes would be one identity. Distinct origins split it but bring other problems (below).                                     |
| C. Record each person in a separate run, then compose                       | Only for a manual capture. Two runs share no clock and the replication between them cannot be staged twice the same way, so it needs a shared timeline log and still drifts with network timing. |

**Option B, measured.** A host page with two iframes on `http://127.0.0.1:8765` gave both the same
localStorage id, while a third on `http://localhost:8765` got its own. So B needs one origin per person
(two ports, or `127.0.0.1` beside `localhost`), and even then:

- the app runs as a cross-origin, third-party frame, where Chromium partitions storage and workers by the
  top-level site and Composer's boot (OPFS SQLite in a worker, cross-origin isolation) is not tested;
- `localhost` resolves to `::1` first, which the e2e suite found strands invitations;
- only one frame holds keyboard focus at a time, so the other peer's editor shows as blurred, and remote
  carets and presence read differently from a real side-by-side;
- each pane gets half of one screencast's pixels.

**Option C** stays useful when a person records each screen by hand. The flow would need to log every
step's wall-clock start on both machines (a shared timeline file, or an NTP-synced clock) and the
composer would align panes on the first common step rather than on a cut. Option A makes the shared
clock free.

## Recording by hand: two drivers

When the flow cannot be scripted ahead of time (an agent's reply decides the next step, or you are
diagnosing as you go), run one `driver.mjs` per person and drive both over their HTTP ops. Each driver has
its own Chromium profile, so each person is a new device with a new HALO identity.

```bash
# One driver per person, each on its own port and output directory. --scale 1: two 2x recorders plus two
# Composer instances exhaust memory ("Target crashed") on a sandbox.
node .agents/skills/autocue/scripts/driver.mjs --port 7334 --url http://127.0.0.1:4173/ --out /tmp/sbs/josiah --scale 1 &
node .agents/skills/autocue/scripts/driver.mjs --port 7335 --url http://127.0.0.1:4173/ --out /tmp/sbs/dima --scale 1 &

# Every op carries that driver's token (written to <out>/token).
op() { curl -sS -H "x-demo-token: $(cat /tmp/sbs/$1/token)" "localhost:$2/cmd" -d "$3"; }
op josiah 7334 '{"op":"caption","text":"Josiah asks Kai to keep him posted"}'
```

1. **Boot one at a time.** Start the second driver once the first shows the deck: two cold boots at once
   can time out the client worker (`WorkerConnectionError` after 15 s). A reload (`goto` with
   `"waitUntil":"commit"`) recovers.
2. **Set up off camera through the debug globals**, not the UI: `window.composer.invoke(key, input)` for
   operations (`org.dxos.operation.client.updateProfile`, `org.dxos.operation.space.create`, ...) and
   `window.__DXOS__.client` for the rest.
3. **Join the second person over EDGE.** Two drivers share no in-memory signaling, so the bundle needs
   `DX_EDGE_BASE_URL` pointing at a running EDGE (`moon run edge:dev` serves `http://localhost:8787/`).
   Create the invitation in the first page and hand it to the second through `eval`:
   - first page: `space.share({ type: 0, authMethod: 0, multiUse: true })`, then serialize its `get()` with
     a replacer for `bigint` and `Uint8Array`;
   - second page: rebuild those values and call `client.spaces.join(invitation)`; state `5` is success.
     A join stuck at state `1` usually means EDGE is down.
4. **Cut both recorders together** (`{"op":"cut"}` to each, back to back) and record the wall-clock time.
   Everything before the cut is setup and is dropped.
5. **Act in turn and caption the pane that acts.** `caption` draws inside its own page, so a caption
   belongs to the person whose screen shows the action.
6. **`stop` each driver** to write its video, then tile them, padding the later cut:
   `compose.mjs --in josiah.webm --label Josiah --in dima.webm --label Dima --offsets 0,<ms> --out out.webm`.

`driver.mjs` must not crash on an `eval`/`invoke` result it cannot serialize: it encodes the reply before
writing headers, and returns the error as an op failure instead.

## Limits

- **`pair.mjs` is headless only.** Drive by hand with two drivers (above); for a person recording their own
  screen, `messenger-demo.spec.ts`'s `DEMO=1` mode tiles two headed windows instead.
- **No trimming yet.** `trim-static.mjs` measures motion per file; dropping a still stretch from one pane
  would desynchronise the other. Trimming the composed video works, because stills are then still in
  both panes at once. `timeline.json` keeps its captions in `driver.mjs`'s `steps` shape, so the trimmer
  gives each caption its `--caption-hold` and remaps it into chapters and WebVTT:
  `trim-static.mjs --in side-by-side.webm --timeline timeline.json --out trimmed.webm`.
- **Encode cost scales with width.** Two 1024x900 panes at 2x compose to about 4100x1900 VP9. `--scale 1`
  or `1.5` is much faster for drafts.
