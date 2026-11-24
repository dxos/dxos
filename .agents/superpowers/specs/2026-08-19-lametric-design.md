# LaMetric TIME — projecting a space onto a pixel display

Status: approved 2026-08-19. Stacked on [#12678](https://github.com/dxos/dxos/pull/12678)
(`plugin-stream-deck`), which lands first and is not modified by this work.

Tracked as M4 in [`.agents/projects/stream-deck/TASKS.md`](../../../.agents/projects/stream-deck/TASKS.md).
Companion design: [`2026-08-19-stream-deck-design.md`](./2026-08-19-stream-deck-design.md).

## Goal

Show the active space on a [LaMetric TIME](https://store.lametric.com/products/lametric): progress
while a task is running, space statistics otherwise. The same projection the Stream Deck's dials
show, on hardware that sits on a desk and is always on.

## Device facts

Verified against LaMetric's API v2.3.0 documentation before designing, because they decide the whole
architecture.

|             | Value                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| Display     | 37x8 white LED matrix, plus an 8x8 colour block on the left                                                   |
| Icons       | 8x8 PNG or GIF (base64 data URI), or a numeric icon ID from `developer.lametric.com/icons`                    |
| Input       | None reachable from the API — the buttons switch apps and are not bindable                                    |
| Frame model | An app cycles through frames: `{text, icon}`, `{goalData: {start, current, end, unit}}`, `{chartData: [...]}` |

The device exposes **two** unrelated write surfaces:

1. **Indicator App** — `POST /api/v1/dev/widget/update/<app-id>/<widget-id>`, header
   `X-Access-Token`. A persistent screen the user rotates to. Reachable at **both**
   `https://<device-ip>:4343` and `https://developer.lametric.com` with an _identical_ path, header
   and body. Requires the user to create and publish an app once on the developer portal.
2. **Device notifications** — `POST /api/v2/device/notifications`, Basic auth `dev:<device-api-key>`.
   A transient interruption that pushes over whatever is showing. LAN only, no app needed.

This design uses **(1) only**. It is the dashboard surface; (2) is the alert surface and is out of
scope (see below).

**Correction, 2026-08-19 (after implementation).** The original claim here — that local and cloud
were byte-identical and differed only in base URL — was wrong, and it was the load-bearing premise of
the transport design. LaMetric does not permit a custom indicator app to be pushed to locally; local
push goes through their stock **My Data (DIY)** app, on a different API version, a different path,
and a different authentication scheme:

|      | Local                                                       | Cloud                                      |
| ---- | ----------------------------------------------------------- | ------------------------------------------ |
| Path | `/api/v2/widget/update/com.lametric.diy.devwidget/<widget>` | `/api/v1/dev/widget/update/<app>/<widget>` |
| Auth | `Authorization: Basic dev:<device api key>`                 | `X-Access-Token: <token>`                  |
| App  | LaMetric's stock DIY app, a fixed package                   | a published app of your own                |

Only the `{frames: [...]}` body is shared. Verified against
[`klein0r/ioBroker.lametric`](https://github.com/klein0r/ioBroker.lametric), which drives real
hardware. Two consequences beyond the transport:

- The DIY **widget UUID identifies one installation** and appears nowhere in LaMetric's apps or
  portal, so the plugin discovers it from `GET /api/v2/device/apps`. That is required for setup to be
  possible at all, not a convenience.
- Setup for the common (local) case is **two values, not four**: the device address and the device
  API key. No app to create, nothing to publish.

Everything above the transport was unaffected: the payload schema, the frame projection, the pusher,
the replica and the dashboard capability did not change.

## Why there is no second package

The Stream Deck needed `@dxos/composer-stream-deck` because Elgato's application holds the HID
device exclusively, so a Composer-owned driver would mean "Composer or Elgato, never both". LaMetric
has no equivalent: the device is an HTTP server on the LAN and its cloud endpoint is an HTTP server
on the internet. Anything that can issue a request can drive it. There is no host process to build.

There is also no input, so there is no protocol — the traffic is one-way and the payload is
LaMetric's own, not ours.

## Architecture

```
plugin-space                    plugin-lametric                     device
------------                    ---------------                     ------
Dashboard capability   ──────►  dashboard-driver  ──►  frames  ──►  LocalTransport  ──►  :4343
  (facts, one atom)                                                 CloudTransport  ──►  developer.lametric.com
        │
        └───────────────────►  plugin-stream-deck (unchanged consumers)
```

### 1. `plugin-space` gains `SpaceCapabilities.Dashboard`

A device-agnostic projection of the active space, contributed as a singleton atom.

```ts
/** Device-agnostic projection of the active space, for peripheral displays. */
export type SpaceDashboard = {
  readonly stats: SpaceStats;
  readonly tasks: readonly Progress.TaskProgress[];
  readonly favorites: readonly Shortcut[];
};

export const Dashboard = Capability.makeSingleton<Atom.Atom<SpaceDashboard>>()(
  `${meta.profile.key}.capability.dashboard`,
);
```

The capability module owns the subscriptions that `plugin-stream-deck`'s `bridge-driver.ts`
currently runs itself:

- the layout atom, to follow the active space;
- `Filter.everything()`, for the statistics;
- `Filter.type(Tag.Tag)`, rebinding the favorites query whenever the `favorite` tag appears or is
  deleted;
- the progress registry's snapshot atom;
- the plugin manager's `enabled` atom.

**One set of queries regardless of how many peripherals are attached.** Today two device plugins
would each run a `Filter.everything()` over the space.

It publishes **facts, not geometry**: no slot counts, no truncation, no icon resolution. Each device
plugin projects the facts onto its own hardware. This is the boundary that keeps `plugin-space` free
of any knowledge that Stream Decks or LaMetrics exist.

**Moving from `plugin-stream-deck` into `plugin-space`:** `toSpaceStats`, `findFavoriteTag`,
`FAVORITE_TAG`, `SpaceStats`, the favorite-object → spec mapping, and `toDialSpecs` (already
device-agnostic — the slot count is a parameter).

**Staying in `plugin-stream-deck`:** every renderer, `buildFrame`, `resolveIcon`/`useIcons`, the
bridge, the protocol, and the 144x144 / 8-key / 4-dial geometry.

**Renames on the way in.** `DialSpec` → `MetricSpec`, `KeySpec` → `Shortcut`. On LaMetric a
`DialSpec` becomes a _frame_, not a dial; leaving Stream Deck vocabulary in a `plugin-space`
capability would misname it permanently. `toDialSpecs` → `toMetrics`, `toKeySpecs` → `toShortcuts`.

These edits touch files that appear in #12678's diff. They happen on **this** branch, so #12678
lands unmodified and this work applies on top.

### 2. `@dxos/plugin-lametric`

Package shape follows `plugin-stream-deck` (which follows `plugin-sample`): `private: true`,
`workspace:*` deps, `labs` tier in `dx.config.ts`, subpath `imports` per module.

| Module                             | Responsibility                                                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `protocol/LaMetric.ts`             | Effect Schema for the widget payload. Not our protocol — LaMetric's, modelled so a malformed frame fails at the boundary rather than on the wire. |
| `render/frames.ts`                 | Pure `MetricSpec[] → LaMetric.Frame[]`. Snapshot-testable in node.                                                                                |
| `transport/LaMetricTransport.ts`   | `{ push(payload): Promise<void> }` plus `selectTransport`.                                                                                        |
| `transport/LocalTransport.ts`      | `https://<address>:4343/api/v1/dev/widget/update/<app>/<widget>` via `@tauri-apps/plugin-http`.                                                   |
| `transport/CloudTransport.ts`      | `https://developer.lametric.com/api/v1/dev/widget/update/<app>/<widget>` via `fetch`.                                                             |
| `capabilities/dashboard-driver.ts` | Reads `SpaceCapabilities.Dashboard`, projects, pushes. Headless — the display stays live whether or not a panel is on screen.                     |
| `capabilities/settings.ts`         | Address, app id, widget id, access token, minimum push interval.                                                                                  |
| `components/VirtualLaMetric`       | 37x8 pixel-grid preview rendering the exact frames pushed.                                                                                        |
| `components/LaMetricStatus`        | Rail indicator, rendered only while a push has succeeded.                                                                                         |

### 3. `composer-app`

- `@tauri-apps/plugin-http` added to the dependency catalog and to `src-tauri`'s `Cargo.toml`.
- An `http:default` permission in `src-tauri/capabilities/desktop.json`, **scoped to the configured
  device address** rather than granted globally.
- `LaMetricPlugin` registered in `plugin-defs.tsx` alongside `StreamDeckPlugin`, under the same gate.

## Rendering rules

The display is 37 pixels wide. Everything below follows from that.

**Each `MetricSpec` maps to exactly one frame:**

| Metric                             | Frame                                                                                                     |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Progress, determinate              | `{goalData: {start: 0, current: round(ratio * 100), end: 100, unit: '%'}}` — the device draws its own bar |
| Progress, indeterminate (no total) | `{text: '<title> <detail>'}` — `goalData` needs an `end`, so there is no bar to draw                      |
| Statistic                          | `{text: '<value> <title lowercased>'}`, e.g. `42 objects`                                                 |

- **No icons in v1.** The 8x8 colour block sits to the _left of_ the text and takes width from it,
  and LaMetric's built-in icon IDs have to be chosen by eye against the real display. Text-only
  frames are wider and need no invented constants. Adding icons later changes one pure function.
- **No truncation.** The device scrolls text that does not fit, which beats an ellipsis on a
  37-pixel line. Labels are kept short at the source instead.
- **At most 4 frames**, matching the Stream Deck's dial count. The device cycles frames at a fixed
  rate, so a longer list means a longer wait before a given number comes round again.
- **Favorites are not rendered.** With no bindable input a favorite is a name scrolling past, which
  is not worth a frame slot.

**Known limitation:** a `goalData` frame shows no text, so a determinate task's name is not
displayed. With a cycle of at most 4 frames and usually one active task this is acceptable; emitting
a paired label frame is a tracked follow-up, not a v1 requirement.

## Transport selection and failure

**Both transports issue their request through `@tauri-apps/plugin-http`**, i.e. from Rust, not from
the web view. This is not an optimisation — it is the only thing that works. Probed 2026-08-19:

```
$ curl -X OPTIONS https://developer.lametric.com/api/v1/dev/widget/update/<app>/<widget> \
    -H 'Origin: https://composer.space' -H 'Access-Control-Request-Method: POST'
HTTP/2 405
allow: GET,PUT,POST,DELETE          # no OPTIONS, and no Access-Control-* header on any response
```

`X-Access-Token` is not a CORS-safelisted request header, so every call preflights, and the
preflight is refused. LaMetric's cloud endpoint is therefore unreachable from a browser, exactly as
the LAN device is. One mechanism defeats both.

```
address configured  →  LocalTransport   (https://<address>:4343, or http://<address>:8080)
credentials only    →  CloudTransport   (https://developer.lametric.com)
not in Tauri        →  no transport; the driver does nothing
```

Local is preferred: it avoids a round-trip through LaMetric's servers and works without internet.
Cloud covers the device being on a different network from Composer.

**v1 is desktop-only.** Browser Composer gets a settings panel that says so. Supporting it means a
DXOS edge worker proxying to `developer.lametric.com` — additive, because the transport interface
already isolates the base URL, so it is a third implementation and nothing else changes. Tracked,
not built.

Failure handling mirrors the Stream Deck bridge's posture — **quiet by default**, because most users
have no device:

- A failed push is logged at `log`, not surfaced as an error.
- Consecutive failures back off 1s to 30s, as in `StreamDeckBridge`.
- The status indicator renders nothing until a push has succeeded.
- Configuration that is absent is not an error. Configuration that is present but rejected with 401
  or 404 **is** surfaced in the settings panel, since only the user can fix it.

### Push rate

Two guards, both necessary:

1. **Unchanged-payload suppression** — the serialized payload is compared to the last one sent, as
   `StreamDeckBridge.publish` does.
2. **A minimum interval** (default 5s, configurable). `Filter.everything()` fires on every mutation
   in the space and LaMetric's own documentation warns that push "works best when data is not
   changing too often". A trailing-edge debounce, so the last state always arrives.

## Settings and credentials

Stored via the standard plugin settings capability: `address`, `appId`, `widgetId`, `accessToken`,
`minPushIntervalMs`, `enabled`.

The access token is a credential. For development it arrives in `.secrets/lametric.env` per
`AGENTS.md` — the user creates the file, the agent deletes it when the hardware step is done, and it
is never echoed into chat, a log, or a commit.

## Testing

| Level     | Coverage                                                                                                                                                                                                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| node      | `toMetrics`/`toShortcuts` after the move (existing tests follow them into `plugin-space`); frame mapping incl. determinate, indeterminate, stat and empty; icon table fallback; transport selection across all four configuration states; payload suppression; debounce timing via Effect's TestClock. |
| smoke     | A stand-in HTTP server the driver pushes to, asserting the exact request line, `X-Access-Token` header and body. The equivalent Stream Deck test caught four bundle-only defects that no unit test could see.                                                                                          |
| storybook | `VirtualLaMetric` over the three frame kinds and the empty state; a container story over a live seeded ECHO space.                                                                                                                                                                                     |
| hardware  | The real device, once the token is available.                                                                                                                                                                                                                                                          |

## Spikes

1. ~~**Does `developer.lametric.com` send CORS headers?**~~ **Resolved 2026-08-19: no.** It answers
   `OPTIONS` with `405` and sends no `Access-Control-*` header at all, so the cloud path is
   unreachable from any browser page.
2. ~~**Does the local device answer on plain HTTP?**~~ **Resolved 2026-08-19 against real
   hardware: yes.** Both ports answer:

   ```
   $ curl -s -D - -o /dev/null http://<device>:8080/api/v2
   HTTP/1.1 401 Unauthorized
   WWW-Authenticate: Basic realm="global"
   Access-Control-Allow-Origin: *
   Access-Control-Allow-Headers: *
   Server: Lighttpd
   ```

   **This also corrects the "desktop-only" reasoning.** The _device_ is CORS-permissive — it returns
   `Access-Control-Allow-Origin: *`. What blocks a hosted Composer is the transport, not CORS:
   `http://…:8080` is mixed content from an HTTPS page, and `https://…:4343` presents a self-signed
   certificate. From an `http://localhost` dev origin the device is reachable from the web view
   directly. The Tauri client is still what a shipped desktop build uses, and the cloud path remains
   unreachable from any browser, so the packaging conclusion stands — but only the cloud half of the
   original justification was correct.

   `LocalTransport` keeps `https://…:4343` as its default (encrypted in transit, and Tauri accepts
   the certificate) with `scheme: 'http'` available for the plaintext port.

## Out of scope

- **Notifications / alerts** (`/api/v2/device/notifications`). The natural follow-up — "task
  finished" pushed over whatever is showing. Needs a second credential (the device API key), a
  second client, and de-duplication so it does not spam. Tracked, not built.
- **Favorites frames** and **frame icons**. See the rendering rules.
- **Input.** Not reachable from the API.
- **Browser support.** Needs an edge worker proxying to `developer.lametric.com`; see the
  transport section.
- **LaMetric SKY.** A different device with a different matrix; the frame model does not carry over.

## Consequences

- `plugin-space` gains a capability that has no consumer inside `plugin-space`. That is the point —
  it is a contribution point, like `CreateObjectEntry` and `IdentitySpec` beside it.
- `plugin-stream-deck` gets smaller and its driver loses its query bookkeeping.
- A third peripheral costs a renderer and a transport, not a model.
