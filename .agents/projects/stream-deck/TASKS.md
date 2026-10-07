# Stream Deck — Tasks

_Resume (2026-08-19): NEXT GOAL is the **Stream Deck hardware pass** (M2's last open item) —
LaMetric is done and working on real hardware. After that, design the **edge-hosted LaMetric app**
under the follow-ups below; publishing a market app is deferred until that design exists.

M1–M4 built and green. Stream Deck (#12678) is open; the LaMetric work is stacked on it on
`claude/stream-deck-lametric-plugin-731d52`. `plugin-space` now owns the device-agnostic projection
(`SpaceCapabilities.Dashboard`) and both device plugins consume it. Everything except the two
physical devices is verified. NEXT: the LaMetric hardware pass (needs `.secrets/lametric.env`), then
the Stream Deck hardware pass, then #12678's 15 CodeRabbit findings — one of which (no frame resent
on reconnect) is already fixed on this branch._

Design and decisions: [DESIGN.md](./DESIGN.md).

## Phase 1 (M1): Model and renderers — no hardware required

Everything that can be built and verified without the device: the shared protocol schema, the
favorites/monitor models over ECHO, and pure SVG renderers. The Storybook "virtual Stream Deck +"
renders the identical markup the device will receive, so the whole visual surface is reviewable
before the wire exists.

### Tasks

- [x] **Protocol** — `src/protocol/Protocol.ts`, exported as the React-free `./Protocol` subpath
  - `Hello` / `Input` / `Frame` messages, `KeyImage`, `DialFeedback`, `PROTOCOL_VERSION`, `DEFAULT_PORT`.
  - `DeviceProfile` (`keys`, `dials`, `keySize`, `dialSize`) with a `streamDeckPlus` constant.
  - Kept in the plugin rather than its own package until the device plugin gives it a second consumer.
- [x] **Scaffold `@dxos/plugin-stream-deck`** (`packages/plugins/plugin-stream-deck`)
  - Package files following `plugin-sample`'s shape; `labs` tier in `dx.config.ts`.
  - `meta.ts`, `plugin.ts`, `StreamDeckPlugin.ts`, `translations.ts`, `index.ts`, `.storybook/`.
- [x] **Favorites model** — the space's `favorite` tag → `KeySpec[]`
  - `Filter.tag` matches a tag URI, not a label, so the keyless `favorite` `Tag` is resolved first.
  - Stable sort (label, then target); `Obj.getLabel` / `Obj.getIcon` for name and icon.
  - Tested against a real `EchoTestBuilder` space: tagged vs untagged, and a keyed provider tag
    labelled "favorite" is correctly ignored.
- [x] **Monitor model** — `useProgressMonitors()` → `DialSpec[]`, falling back to space stats
  - Progress mode while any task is `pending`/`running`; else objects / feeds / types / plugins.
  - Tested: both modes, indeterminate tasks, finished/failed tasks ignored, truncation to 4 dials.
- [x] **Pure key renderer** — `renderKey(spec, { size, icon }): string`
  - 144×144 SVG: inlined icon, wrapped/ellipsised label, literal hue colours (the device cannot
    resolve CSS custom properties).
  - Tested: geometry, hue mapping and fallback, XML escaping, icon inlining, empty slot.
- [x] **Pure dial renderer** — `renderDial(spec): Protocol.DialFeedback`
  - Semantic `title` / `value` / `bar`, leaving the Elgato layout mapping to the device plugin.
  - Tested: determinate, percentage fallback, indeterminate, stat.
- [x] **Icon markup resolver** — `resolveIcon(name)` / `useIcons(names)` from the in-DOM sprite
  - Reads `[data-dx-icon-sprite] #<name>`; requests via `IconRegistry.requestIcon` and re-renders
    off the registry subscription. Browser-only, kept out of the renderers.
- [x] **Storybook virtual Stream Deck +**
  - `VirtualStreamDeck` renders the exact SVG the device is sent; 3 component stories (stats,
    progress, empty) verified by screenshot, plus a container story over a live seeded ECHO space.
  - Container stories do not render in an ad-hoc root-launched storybook (the client worker fails to
    initialise there — the reference `plugin-kanban` container story is blank too); they pass under
    `moon run plugin-stream-deck:test-storybook`.
- [x] **Register the plugin** in `composer-app`'s `plugin-defs.tsx`, enabled only under `isLabs`.
- [x] **Author `PLUGIN.mdl`** — types, 4 features, 6 acceptance scenarios; wired as a plugin asset
      (`dx.config.ts` `spec:` + `AppCapability.pluginAsset`).
- [ ] **Changeset** — new private package, so likely none required; confirm against
      `agents/instructions/changesets.md`.

## Phase 2 (M2): The wire

The `.sdPlugin` bundle and the WebSocket transport. Needs the physical device and the Elgato app.

### Tasks

- [x] **Scaffold `@dxos/composer-stream-deck`** (`packages/apps/composer-stream-deck`)
  - `layer: application`, mirroring `composer-crx`: a `pack` task emits the `.streamDeckPlugin`
    distributable. It is an Elgato plugin, not a Composer plugin (no `Plugin.Meta`) and not a tool
    (it ships to users, not contributors) — see the design's naming section.
  - Elgato plugin UUID `org.dxos.composer`, so the build output directory is
    `org.dxos.composer.sdPlugin/` (derived from the UUID, therefore gitignored). Marketplace name
    `Composer`. Uppercase is illegal in an Elgato UUID, so `org.dxos.plugin.streamDeck` cannot be
    reused.
  - `manifest.json` with a keypad action (`org.dxos.composer.favorite`) and an encoder action
    (`org.dxos.composer.monitor`); Node entrypoint using `@elgato/streamdeck`.
  - Dev loop via Elgato's `streamdeck` CLI (`link`, `dev`, `restart`).
- [x] **WS server in the sdPlugin** — `127.0.0.1:21435`, `Hello` handshake, one client at a time
  - A second connection supersedes the first; malformed and unrecognized messages are discarded
    without dropping the connection or the host process. 6 tests.
- [x] **Slot assignment** — placed instances ordered by `(row, column)`; unplaced ones dropped. 5 tests.
- [x] **Apply frames** — `setImage(svg)` per key, `setFeedback` per dial with `$B1`'s indicator as a
      percentage; the layout is set on appear so a segment placed later still gets the bar.
- [x] **Emit input** — key and dial events reported with their slot; `dialRotate` carries `ticks`.
- [x] **Offline state** — dim "Composer offline" key and dial rendered when no client is connected.
- [x] **`StreamDeckBridge` WS client** in the plugin — backoff (1s→30s), handshake with a
      protocol-version check that refuses rather than loops, unchanged-frame suppression, and a
      socket seam so node tests drive it with `ws`. 8 tests.
- [x] **`useFrame`** — the panel and the device are sent the identical frame, so they cannot drift.
- [x] **Smoke test** (`composer-stream-deck:smoke`) — runs the assembled bundle against a stand-in
      Stream Deck application and asserts registration, the offline state, the greeting, and the
      applied frame. Caught four bugs unit tests could not see: a preserved decorator (invalid JS in
      Node), a module-scope schema built before its module initialized, `ws` resolving to its browser
      build, and Node builtins being bundled through unprefixed specifiers.
- [x] **End-to-end on hardware** — verified 2026-08-19 on a real Stream Deck +. Dials, key
      rendering and key/dial input all confirmed. One defect only hardware could find: `setImage`
      was passed a **bare SVG string**, which the SDK's typings say is accepted but the application
      rejects, silently falling back to the manifest icon — so every key looked like a plugin that
      had never run, including the offline state. Fixed by wrapping in
      `data:image/svg+xml;charset=utf8,<percent-encoded>`; base64 was tried first and is _also_
      rejected. The smoke test now asserts the payload form, not just that `setImage` was called.
      Two setup steps that silently do nothing are recorded in the package README: the Stream Deck
      application must be restarted (not just the plugin) after a first `link`, and `Monitor` is an
      Encoder action so it is hidden until the touch strip is selected.
- [ ] ~~End-to-end on hardware~~ — superseded, original note:
      `streamdeck link packages/apps/composer-stream-deck/org.dxos.composer.sdPlugin` then
      `streamdeck restart org.dxos.composer`, with Composer's Stream Deck panel open.

## Phase 3 (M3): Interaction

### Tasks

- [x] **Headless bridge driver** (`capabilities/bridge-driver.ts`) — owns the _only_ bridge, gated on
      `ClientEvents.SpacesReady` rather than on the plugin's UI
  - Subscribes to the layout atom (active space), a `Filter.everything()` query (stats), a `Tag` query
    (rebinding favorites when the `favorite` tag appears or is deleted), the progress snapshot atom,
    the plugin manager's `enabled` atom, and the icon registry (icons resolve out of the sprite
    asynchronously, so a key can be published without its glyph and needs republishing).
  - The panel no longer opens a bridge: the device accepts one client, so two would fight over it.
    Surfaces read the new `StreamDeckCapabilities.BridgeStatus` atom instead.
- [x] **Key press → open object** — `KeySpec.target` is now the graph navigation path, which is what
      `LayoutOperation.Open` consumes, so a press needs no lookup. Resolved against the frame last
      published rather than a re-query.
- [x] **Focus the window** on desktop — `getCurrentWindow().show()` + `setFocus()`, guarded by
      `isTauri()`. Verified on the wire by the smoke test's slot-1 press check.
- [x] **Status indicator** — rendered only while a device is connected, since most users have no
      device plugin and a permanent disconnected state would be rail noise. The panel shows the same
      state as a caption.
- [ ] **Settings surface** — deferred, not built. The plugin registry toggle already turns the whole
      thing off, so a second switch would be redundant until there is something else to configure
      (which space to bind, or a non-default port).

## Phase 4 (M4): Later

- [x] **LaMetric TIME support** — a second hardware surface for the same space dashboard
      ([product page](https://store.lametric.com/products/lametric)). Designed and built 2026-08-19:
      [design](../../../agents/superpowers/specs/2026-08-19-lametric-design.md) ·
      [plan](../../../agents/superpowers/plans/2026-08-19-lametric.md).
  - **No second package.** The device is an HTTP server on the LAN, so there is no exclusivity
    problem and no `.sdPlugin` equivalent to build.
  - **Local and cloud are different requests.** The design initially assumed one request at two
    hosts; that was wrong. A custom indicator app cannot be pushed to locally — local push goes
    through LaMetric's stock "My Data (DIY)" app at
    `/api/v2/widget/update/com.lametric.diy.devwidget/<widget>` with Basic `dev:<device api key>`,
    while cloud push uses the v1 developer API with an access token. Only the body is shared. The
    widget UUID is discovered from `GET /api/v2/device/apps` because it appears nowhere in
    LaMetric's UI. Corrected 2026-08-19 before hardware, from the ioBroker adapter's source.
  - **`plugin-space` now owns the projection.** `SpaceCapabilities.Dashboard` publishes the space's
    stats, tasks and favorites; both device plugins consume it, so N peripherals cost one set of
    queries rather than N. `KeySpec`/`DialSpec` became `Shortcut`/`MetricSpec` on the way in.
  - **Verified without hardware:** 12 render tests, 6 transport tests, 5 pusher tests, 3 protocol
    tests, 2 smoke tests against a stand-in HTTP device, 5 storybook stories rendered and screenshot.
  - [x] **End-to-end on the device** — verified 2026-08-19 against real hardware, driving the actual
        `discoverWidgetId` / `selectTransport` / `toFrames` code rather than curl. Discovery found the
        DIY widget, statistics rendered, and a progress sweep (10 → 100%) drew the bar. Plain
        `http://<ip>:8080` answers, so the certificate path is optional; the device also returns
        `Access-Control-Allow-Origin: *`, so CORS never blocked it — mixed content and the
        self-signed certificate do.
  - [x] **Hardware pass complete** — statistics cycle on the device, driven through the real
        `discoverWidgetId` / `selectTransport` / `toFrames` code. Two defects only hardware could
        find, both fixed: frames need an explicit `index` (without it the device renders just the
        first), and the DIY app must be set to **Push** in the LaMetric mobile app (with no mode
        selected it answers `{"success":{"message":"ok"}}` and ignores the update). Note the device
        does **not** validate the widget id — a bogus one also returns ok — so a 200 is not evidence
        that anything rendered.
  - [ ] **In-app run** — the transport and projection are proven on hardware, but the plugin has not
        yet driven the device from a running `composer-app:tauri-dev` build. That exercises the
        settings surface, discovery re-running on a settings change, and the debounce under real
        space churn.

### LaMetric follow-ups

- [ ] **Publish a DXOS indicator app to the LaMetric market — DEFERRED 2026-08-19.** Shipping to
      users should not require them to install "My Data (DIY)" and pick a transport mode, but this is
      not the next thing to build. Design it as an **edge** app rather than a push app (below) before
      committing to publishing anything.
- [ ] **Edge-hosted LaMetric app.** The promising shape, and the reason publishing is deferred rather
      than scheduled: LaMetric's DIY app offers **Poll** alongside Push, so a published DXOS app
      could simply _fetch_ its frames from a DXOS edge endpoint on the device's own schedule. That
      inverts today's constraints in our favour: - No local push, so no device API key, no IP address, and nothing for the user to paste — the
      setup collapses to installing the app and authorising a space. - No CORS problem and no Tauri dependency, because nothing is issued from the client at all;
      the device talks to edge directly. - The display keeps working with Composer closed, which is the same motivation as the Stream
      Deck project's "edge mode" item below — the two should be designed together.
      What it needs: an edge route rendering `{frames}` for a space, an authorisation model for it
      (the device sends no credential of ours), and a published app pointing at it. The frame
      projection (`toMetrics` → `toFrames`) is unchanged and already device-agnostic.
- [ ] **Browser support** — an edge worker proxying to `developer.lametric.com`. v1 is desktop-only:
      the cloud answers a CORS preflight with 405 and sends no `Access-Control-*` header, and the LAN
      device is plain HTTP or self-signed, so the web view can reach neither. The transport interface
      isolates the base URL, so this is a third implementation and nothing else changes.
- [ ] **A label beside a determinate task.** A `goalData` frame shows no text, so the display reads
      "42%" without saying what is at 42%. Emitting a paired label frame is cheap (the cycle is
      capped at 4 and there is usually one task) but was not a v1 requirement.
- [ ] **Frame icons.** The 8x8 colour block takes width from the text and LaMetric's built-in icon
      IDs have to be chosen by eye against the real display, so v1 is text-only.
- [ ] **Alerts** via `/api/v2/device/notifications` — a transient push over whatever is showing, for
      "task finished". Needs the device API key (a second credential), a second client, and
      de-duplication so it does not spam.
- [ ] **Dial bindings** — undecided; rotation/press are transported and logged until then.
- [ ] **Persisted slot ordering** — a `StreamDeckLayout` ECHO object with ordered slots.
- [ ] **Edge mode** — serve the same protocol from edge so the dashboard survives Composer being
      closed entirely (admin vs. user views).

## References

- [DESIGN.md](./DESIGN.md) — architecture, protocol, and the rationale for the Elgato-plugin route.
- Elgato SDK: [keys / `setImage`](https://docs.elgato.com/streamdeck/sdk/guides/keys/),
  [dials & touch strip](https://docs.elgato.com/streamdeck/sdk/guides/dials/),
  [SD+ layouts](https://docs.elgato.com/streamdeck/sdk/references/touchscreen-layout/).
- Repo precedents: `packages/plugins/plugin-osrm` (package shape),
  `packages/plugins/plugin-progress` + `packages/sdk/app-toolkit/src/app-framework/progress-registry.ts`
  (monitor data), `packages/apps/composer-crx` (third-party-host bundle).
