# Spec: Migrate Meetings to Cloudflare RealtimeKit (media + native transcription)

Status: **Draft for review** · Owner: TBD · Scope: `plugin-calls`, `plugin-meeting`, `plugin-transcription`, edge `calls-service`

## 1. Goal & guiding constraints

Adopt **Cloudflare RealtimeKit** for call **media transport** and **native transcription**, while keeping the
**DXOS swarm as the source of truth for presence/room state** (the local-first differentiator) and the
**ECHO transcript pipeline** (correction / entity-extraction / summarization / translation).

Hard constraints from the requester:

1. **Every change must be testable offline** — via storybook and/or a headless harness the author can inspect and
   iterate on. No change lands without a way to exercise it without a live Cloudflare meeting.
2. **UI is essentially untouched.** Any UI that _is_ touched must use the design system (`@dxos/react-ui*`), per the
   composer-ui skill. (Audit below confirms the UI is already transport-agnostic, so this is mostly "don't regress".)

This is **Path A′**: RealtimeKit for transport+AI, swarm retained for presence. It is deliberately _not_ full
RealtimeKit-meeting adoption (which would cede presence to Cloudflare).

## 2. Current architecture (verified)

- **Media:** `CallsServicePeer` (`plugin-calls/src/calls/util/calls-service.ts`) is a hand-written client for the raw
  **Cloudflare Calls SFU REST API** (`/sessions/new`, `/sessions/{id}/tracks/new?PUSHING|PULLING`, `/renegotiate`,
  `/tracks/close`), proxied via edge `/api/calls/*` → `rtc.live.cloudflare.com/v1/apps/{APP_ID}`. It is **hard-wired**
  into `MediaManager.join()` (`media-manager.ts:120`, `this._state.peer = new CallsServicePeer(serviceConfig)`).
- **Presence/signaling:** `CallSwarmSynchronizer` over the **DXOS edge swarm** using protobuf `UserState`
  (`dxos/edge/calls.proto`): `joined/speaking/raisedHand`, encoded track names, per-activity Lamport `Activity` map,
  and `MeetingPayload { meetingId, transcriptDxn, transcriptionEnabled }`. Cloudflare is a dumb relay.
- **UI:** every component/container consumes derived `CallManager` atoms (`usersAtom`, `audioTracksToPlayAtom`,
  `videoStreamAtom(name)`, `selfAtom`, …) + plain `MediaStreamTrack`/`MediaStream`. **Zero references** to
  `sessionId`/`mid`/`pushTrack`/`pullTrack`/SFU in `components/` or `containers/` — except `CallDebugPanel.tsx`,
  which reads `state.media.peer.session.peerConnection` (dev-only).
- **Transcription:** per-participant, **client-side**. Each client taps its own mic `MediaStreamTrack`
  (`plugin-meeting/src/capabilities/call-extension.ts`: `transcriptionManager.setAudioTrack(mediaState.audioTrack)`),
  records 200ms WAV chunks, buffers ~10s, POSTs base64 WAV to edge `/transcribe` = Workers AI
  **Whisper large-v3-turbo, one-shot**. Downstream `PipelineRuntime` stages produce `ContentBlock.Transcript` blocks
  appended to a `Feed` referenced by a `Transcript` ECHO object. Speaker attribution is implicit (each client writes
  its own segments tagged with its `identityDid`); the `diarization` stage is a stub.
- **Edge `calls-service`:** pure proxy + one AI call. Routes: `/api/calls/*` (SFU, Bearer `CF_CALLS_APP_SECRET`),
  **`/api/v2/*` → RealtimeKit REST** (`api.cloudflare.com/.../realtime/kit/{KIT_APP_ID}`, Bearer
  `CF_REALTIME_KIT_API_TOKEN`) — **already provisioned** (`CF_REALTIME_KIT_APP_ID = 2b152cad-…`) but **`skipAuth: true`
  and unused by the client**, and `/transcribe` (Workers AI Whisper). No DO/KV/R2.

## 3. RealtimeKit surface (verified)

- **Client SDK** (`@cloudflare/realtimekit`): `RealtimeKitClient.init({ authToken })`. Local: `meeting.self.audioTrack`
  / `.videoTrack` (plain `MediaStreamTrack`), `enableAudio()/disableAudio()/enableVideo()/disableVideo()`, events
  `roomJoined`, `audioUpdate`, `videoUpdate`. Remote: `meeting.participants.joined` (map keyed by peer `id`) / `.active`;
  each participant exposes `id`, `userId`, **`customParticipantId`**, `name`, `audioTrack`, `videoTrack`,
  `audioEnabled`, `videoEnabled` + `participantJoined`/`participantLeft`/media-update events.
- **Transcription:** `meeting.ai.on('transcript', { name, transcript, peerId, userId, customParticipantId,
isPartialTranscript, timestamp, id })`. Real-time = Deepgram Nova-3 on Workers AI, enabled per-participant via preset
  `permissions.transcription_enabled: true` + meeting `ai_config.transcription`. Post-meeting = Whisper via
  `transcribe_on_end` + webhook.
- **REST:** `POST …/meetings` `{ title }` → `{ data: { id } }`; `POST …/meetings/{id}/participants`
  `{ name, preset_name, custom_participant_id }` → `{ data: { id, token } }` where `token` is the client `authToken`.
  **`customParticipantId` is set at participant creation and is read-only on the client** → identity binding must
  happen server-side in the edge.
- **Key mismatch:** RealtimeKit has **no `pushTrack`/`pullTrack`/`sessionId`/`mid`**. You enable local media and read
  remote tracks off the roster **keyed by participant**. The DXOS "pull by encoded track name" model does not map — we
  resolve remote tracks by **`customParticipantId` == DXOS identityDid**.

## 4. Target architecture (Path A′)

```
DXOS identity ──(VP auth)──► edge /api/v2/rooms/{roomId}/join
                                   │  reuses/creates RealtimeKit meeting + adds participant
                                   │  custom_participant_id = deviceKey, name = identityDid
                                   ▼
client: RealtimeKitClient.init({ authToken })         DXOS swarm (unchanged):
   local  meeting.self.audioTrack/.videoTrack            UserState { joined, speaking, raisedHand,
   remote meeting.participants.joined[*].audioTrack                   tracks{audio/videoEnabled}, activities,
          (mapped by customParticipantId → deviceKey)                 MeetingPayload{ meetingId, transcriptDxn } }
   ai     meeting.ai.on('transcript') ──► ECHO Transcript pipeline (unchanged downstream)
                                   │
                                   ▼
   MediaManager populates the SAME atoms (pulledAudioTracks / pulledVideoStreams) the UI already reads
```

Two swappable media backends behind one interface; **swarm still owns presence**; **UI and transcript pipeline
unchanged**.

## 5. Design resolution of each concern

### 5.1 Transport seam (the real refactor)

`CallsCapabilities.CallTransportProvider` (`{ kind, label, join, leave }`) is only a join/leave wrapper — **not** the
media seam. The media seam is the **implicit peer contract** hard-wired in `MediaManager`. Extract it:

```ts
// plugin-calls/src/calls/transport/media-transport.ts  (new)
export interface MediaTransport extends Resource {
  readonly kind: string; // 'org.dxos.call.transport.cloudflare' | '...realtimekit'
  open(): Promise<void>;
  close(): Promise<void>;
  get isOpen(): boolean;

  // Local publish. Cloudflare: push SDP track. RealtimeKit: enable{Audio,Video} + return synthetic descriptor.
  publishTrack(opts: {
    ctx: Context;
    track: MediaStreamTrack | null;
    kind: TrackKind;
    previousTrack?: TrackDescriptor;
    encodings?: RTCRtpEncodingParameters[];
  }): Promise<TrackDescriptor | undefined>;

  // Remote resolution. Cloudflare: pull by encoded track name. RealtimeKit: resolve by participant identity.
  resolveRemoteTrack(opts: { ctx: Context; ref: RemoteTrackRef }): Promise<MediaStreamTrack | undefined>;

  // Optional AI channel (RealtimeKit only). Cloudflare returns undefined.
  transcripts?(): AsyncIterable<TranscriptEvent> | undefined;
}
```

- **Identifiers (current architecture).** A participant is a **device**: swarm `UserState.id = deviceKey.toHex()`
  (`call-swarm-synchronizer.ts:240`), while the swarm envelope also carries the verified `identityKey`. `roomId` and
  `meetingId` are the **same value** — `Obj.getURI(meeting)`, the ECHO Meeting object's DXN (its `ObjectId` is minted by
  `Obj.make`). The swarm topic is `PublicKey.fromHex(md5Hex(roomId))`. So the media-correlation key is the **deviceKey**
  (peer), and the person key is the **identityDid** — two devices of one identity are two participants.
- **`RemoteTrackRef`** is a discriminated union so the two backends key remotes differently without leaking into the
  UI: `{ tag: 'sfu'; name: EncodedTrackName }` vs `{ tag: 'peer'; deviceKey: string; kind: TrackKind }` (the `deviceKey`
  is exactly `UserState.id`).
- `MediaManager` gains an **injected factory** (default `= (cfg) => new CloudflareTransport(cfg)`), removing the
  hard-wired `new CallsServicePeer`. `CallManager` forwards a `transportFactory` option. This injection is also what
  makes headless testing possible (§6).
- `CloudflareTransport` is `CallsServicePeer` renamed/wrapped to satisfy the interface — **behaviour identical**, so
  the SFU path is a no-op refactor validated by existing stories/tests.
- **Reconciliation change (RealtimeKit only):** today `_onCallStateUpdated` derives desired pulls from swarm
  `UserState.tracks` encoded names and calls `_pullTrack(name)`. For RealtimeKit, desired remotes are derived from
  swarm users' `audioEnabled`/`videoEnabled` and resolved via `resolveRemoteTrack({ tag:'peer', deviceKey })` against
  `meeting.participants.joined`, **matched on `customParticipantId == UserState.id` (deviceKey)**. The resulting
  `MediaStreamTrack` is stored in the **same `pulledAudioTracks`/`pulledVideoStreams`** maps under a stable key derived
  from the deviceKey, so `videoStreamAtom`/`audioTracksToPlayAtom` and the whole UI are unchanged. Late-arriving
  RealtimeKit participants are handled by re-running resolution on `participantJoined`/media-update events.

### 5.2 Identity binding + edge token minting

`customParticipantId` is server-set, so the client cannot change it once minted. Add authenticated edge routes (drop
`skipAuth: true`, require `verifiablePresentation`), following the established pattern in
`edge/packages/services/agents/src/api.ts` and `functions-service/src/api.ts`:

```ts
// edge calls-service: POST /api/v2/rooms/:roomId/join  (VP-authed)  body: { deviceKey, meetingId? }
const identityKey = c.get('verifiedIdentityKey');
if (!identityKey) throw new HTTPException(401);
const identityDid = c.get('userIdentity') ?? (await createDidFromIdentityKey(identityKey.toHex()));
const { deviceKey, meetingId: known } = await c.req.json(); // deviceKey == swarm UserState.id
// First joiner (no swarm meetingId yet) creates one; others pass the meetingId read from MeetingPayload.
const meetingId = known ?? (await realtimeKit(c.env, `/meetings`, { title: roomId })).data.id;
const { data } = await realtimeKit(c.env, `/meetings/${meetingId}/participants`, {
  name: identityDid, // person → transcript speaker attribution
  preset_name: PRESET_MEMBER,
  custom_participant_id: deviceKey, // peer → 1:1 media correlation with UserState.id
});
return c.json({ meetingId, authToken: data.token }); // token → RealtimeKitClient.init
```

- **Why `customParticipantId = deviceKey`, not `identityDid`:** the media-correlation key must be 1:1 with the swarm
  participant, which is a device (`UserState.id`). The VP-verified `identityDid` rides along as the participant `name`
  for transcript speaker labels and authorization. `customParticipantId` is not security-critical (it only labels which
  device a track belongs to inside a room the caller is already authorized to join); as a cross-check, the client
  accepts a remote track only if its `customParticipantId` is present in the current swarm roster.
- One or two **app-level presets**: `member` (audio/video + `transcription_enabled: true`) and optionally `viewer`.
  Created once via REST/dashboard; ids configured on the worker.
- Reuse `accountLookupViaHubService` gating if we want to require a Hub account (match `agents` service).

### 5.3 Meeting provisioning from a decentralized room

Keep it simple — **coordinate the `meetingId` over the swarm, no extra edge infra, don't handle races.** The swarm
`MeetingPayload.meetingId` field already exists. First joiner sees no `meetingId` in the swarm state → calls edge
`POST /api/v2/rooms/:roomId/join` which creates a RealtimeKit meeting and returns its id → the client publishes it into
`MeetingPayload.meetingId`. Later joiners read `MeetingPayload.meetingId` from the swarm and pass it to the join route
to get only a participant token. A simultaneous double-create is acceptable (rare; a stray empty meeting is harmless);
we explicitly do **not** add locks/KV/idempotency. No `MEETINGS` KV namespace, no server-side room→meeting map.

### 5.4 Presence reconciliation (two systems, swarm wins)

- **Swarm remains the roster + rich presence** (join/leave, speaking, raisedHand, activities). UI keeps reading swarm
  `usersAtom`. RealtimeKit's own roster is used **only** to obtain remote `MediaStreamTrack`s, matched to swarm users by
  `customParticipantId`.
- Divergence handling: a swarm user with `audioEnabled` but no matching RealtimeKit participant yet ⇒ show the
  participant tile in a "connecting media" state (existing atoms already carry enabled flags independent of track
  presence, so this is a no-op for the UI). RealtimeKit participant with no swarm user ⇒ ignored (swarm is truth).
- Lifecycle: `provider.leave()` tears down both the RealtimeKit client and the swarm join; the existing 10s swarm grace
  is unchanged.

### 5.5 Transcription: native events → existing ECHO pipeline

- Subscribe to `meeting.ai.on('transcript', …)`; map each event to a `ContentBlock.Transcript` (`text` = `transcript`,
  `started` from `timestamp`, **speaker = event `name` (the minted `identityDid`)**, with `customParticipantId`
  (deviceKey) available to cross-check against the swarm roster), feed the **existing** `LivePipeline` /
  `PipelineRuntime` so correction/extraction/summarization/translation are unchanged. `isPartialTranscript` maps to the
  existing `pending` flag.
- **Native events replace client-side capture** for calls: `TranscriptionManager` gains a second source — instead of
  `MediaStreamRecorder` + `/transcribe`, it consumes `transport.transcripts()`. The `MediaStreamRecorder` path stays
  for the **editor/chat** voice-input use cases (unaffected). This is toggled by which transport is active.
- **Writer election (native transcription is centralized → all clients get the same events).** Elect exactly one writer
  to append to the ECHO `Feed`: the peer that owns `MeetingPayload` (meeting creator / first joiner). Non-writers ignore
  events for persistence but may render live. **Dedupe by event `id`** as a safety net so a writer hand-off can't
  double-write. This gives real speaker labels (`customParticipantId`) — retiring the diarization stub for calls.
- Post-meeting Whisper (`transcribe_on_end` + webhook) is a **later, optional** enhancement (authoritative transcript
  reconciliation) — out of scope for phase 1.

### 5.6 UI: untouched, with one dev-only adaptation

- Audit result: UI is transport-agnostic; **no changes** to `Participant`, `ParticipantGrid`, `ResponsiveGrid`, `Call`,
  `Toolbar`, `Lobby`, `AudioStream`, `VideoObject`, `CallArticle`, `CallSidebar`.
- `CallDebugPanel.tsx` reads `state.media.peer.session.peerConnection`. Expose an optional
  `MediaTransport.getDiagnostics(): { peerConnection?: RTCPeerConnection; history?: … }` and have the panel read
  through it; RealtimeKit can surface its underlying `RTCPeerConnection`, else the panel degrades gracefully. This is
  dev-tooling, not user-facing, and uses existing primitives — no design-system work.

## 6. Testability strategy (requirement #1)

**Two tracks.** The **offline track is the landing gate** — every change must be exercisable without a live Cloudflare
meeting (this is what runs in CI). The **live-dev track is the inspection loop** — a storybook variant may connect to
the **edge dev/test environment** (real `calls-service` + real RealtimeKit) for realistic manual iteration; it is
additive, never gates a merge, and never runs in CI (it requires a real identity + a real meeting, precisely what the
gate must not).

### Offline track (required for every change)

1. **UI stories — already offline, unchanged.** `useSeedCallManager(makeCallState(self, users))` freezes
   `CallManager` state (`_setState` → `#seeded`), so `Call.stories.tsx` / `CallArticle.stories.tsx` render deterministic
   participants with no backend. Adding RealtimeKit must **not** regress these. Verified harness:
   `plugin-calls/src/testing/call-testing.tsx` (`withCallManager`, `makeUser`, `makeCallState`).
2. **Transport-level headless tests — new `FakeRealtimeKitTransport`.** The injected `transportFactory` (§5.1) lets a
   story/test pass a fake implementing `MediaTransport` in-memory: local tracks via `getUserMedia` or a synthetic
   `MediaStreamTrack` (canvas/oscillator), remote tracks via an in-process loopback `RTCPeerConnection` pair or
   canned tracks, and **`transcripts()` yielding scripted `TranscriptEvent`s** on a `TestClock`. This exercises the
   real `MediaManager` reconciliation + the transcript→ECHO wiring with **zero network**.
   - Offline story `RealtimeKitCall.stories.tsx` (fake transport): drives join → local publish → 2 fake remotes →
     scripted transcript, asserting via a `play()` function that tiles and transcript blocks appear. Mirrors the
     existing `plugin-meeting/src/stories/CallTranscription.stories.tsx` shape.
   - Colocated `*.test.ts` for `MediaManager` reconciliation and transcript→ECHO wiring, `TestClock`-driven (no sleeps).

### Live-dev track (encouraged for inspection; opt-in)

3. **Live storybook against edge dev.** A `RealtimeKitCall.live.stories.tsx` variant (or a `?live` story arg) selects a
   real transport pointed at the **edge dev environment** — configurable `edge.url` (e.g. the dev/staging
   `calls-service` deployment) — and initializes `RealtimeKitClient` with a token minted from a dev identity via
   `POST /api/v2/rooms/:roomId/join`. The story `withCallManager({ transportFactory: realtimeKitFactory, edgeUrl })`
   uses the real edge dev + real RealtimeKit meeting so the author can see end-to-end media + native transcription.
   Two browser tabs on the same story `roomId` exercise multi-peer. **Not in CI**; requires a dev identity + network.
   - Config seam: the story passes an `edgeUrl` (dev/test) into `storyConfig.runtime.services.edge.url`; the transport
     factory selects `kind = realtimekit`. Keep the real `@cloudflare/realtimekit` import behind the live factory so the
     offline stories (Track A) don't pull the SDK.

Author-inspection loop: run storybook from the worktree (`moon run storybook-react:serve -- --port 9014 --no-open
--ci`), drive the offline `RealtimeKitCall` via Playwright/preview tools for CI-grade assertions, and open the
`live` variant against edge dev for realistic manual verification. Unit: `moon run plugin-calls:test`.

## 7. Phased plan (each phase independently landable + tested)

- **Phase 0 — Seam extraction (no behaviour change).** Introduce `MediaTransport`, wrap `CallsServicePeer` as
  `CloudflareTransport`, inject `transportFactory` into `MediaManager`/`CallManager`. Add `FakeTransport` for tests.
  _Accept:_ all existing calls stories/tests green; new fake-transport test drives a synthetic call headlessly.
- **Phase 1 — RealtimeKit transport (media only, transcription still old path).** Add `@cloudflare/realtimekit` dep,
  implement `RealtimeKitTransport` (publish via enable\*, resolve remotes by deviceKey), add edge
  `POST /api/v2/rooms/:roomId/join` (VP auth, create-or-reuse meeting + add participant), presets. Feature-flag
  transport `kind` via config. _Accept (gate):_ offline `RealtimeKitCall` story (fake) + `MediaManager` tests green; UI
  diff = 0 except `CallDebugPanel` diagnostics indirection. _Inspect (live-dev):_ `RealtimeKitCall.live` connects two
  tabs against the edge dev environment.
- **Phase 2 — Native transcription.** Wire `meeting.ai` transcript events → `TranscriptionManager` →
  existing pipeline; writer election + id-dedupe; preset `transcription_enabled`. _Accept:_ transcript-wiring test with
  scripted events on `TestClock` produces the same `ContentBlock.Transcript`/`Feed` output as today; speaker labels
  populated; no duplicate feed writes under simulated multi-client.
- **Phase 3 — Cutover & cleanup.** Flip default transport to RealtimeKit; keep Cloudflare transport behind the flag for
  rollback. Optionally add post-meeting Whisper reconciliation. Remove the client-side `/transcribe` call path for
  calls (retain for editor/chat). Retire diarization stub for calls.

## 8. File-level change map

| Area                                                            | Change                                                                                        |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `plugin-calls/src/calls/transport/media-transport.ts`           | **new** `MediaTransport` interface + `RemoteTrackRef`/`TrackDescriptor` types                 |
| `plugin-calls/src/calls/transport/cloudflare-transport.ts`      | **new** wrap existing `CallsServicePeer` (move `util/calls-service.ts`)                       |
| `plugin-calls/src/calls/transport/realtimekit-transport.ts`     | **new** RealtimeKit-backed impl                                                               |
| `plugin-calls/src/calls/transport/fake-transport.ts` (testing)  | **new** in-memory transport for headless stories/tests                                        |
| `plugin-calls/src/calls/media-manager.ts`                       | inject `transportFactory`; branch remote-resolution by `RemoteTrackRef`                       |
| `plugin-calls/src/calls/call-manager.ts`                        | thread `transportFactory`; select `kind` from config                                          |
| `plugin-calls/src/capabilities/call-transport.ts`               | register RealtimeKit provider `kind`; config-driven selection                                 |
| `plugin-calls/src/containers/CallDebugPanel/CallDebugPanel.tsx` | read diagnostics via `MediaTransport.getDiagnostics()`                                        |
| `plugin-calls/src/testing/call-testing.tsx`                     | `withCallManager({ transportFactory })`; RealtimeKit fake helpers                             |
| `plugin-calls/src/**/RealtimeKitCall.stories.tsx`               | **new** offline story with fake transport + `play()`                                          |
| `plugin-transcription/src/transcription-manager.ts`             | add transcript-event source (from transport) alongside recorder                               |
| `plugin-meeting/src/capabilities/call-extension.ts`             | when RealtimeKit active, feed `transport.transcripts()` instead of mic track; writer election |
| `plugin-meeting/src/stories/CallTranscription.stories.tsx`      | variant driving scripted native transcript events                                             |
| edge `calls-service/src/worker/api.ts`                          | `POST /api/v2/rooms/:roomId/join` (VP auth, create-or-reuse meeting + add participant)        |
| edge `calls-service/wrangler.jsonc`                             | preset id vars (no KV)                                                                        |
| `packages/core/protocols/.../calls.proto`                       | (no change — `MeetingPayload.meetingId` already exists)                                       |

## 9. Risks & open questions

1. **Meeting provisioning** — settled: coordinate `meetingId` via swarm `MeetingPayload`, first-joiner creates, no
   locks/KV, double-create tolerated (§5.3).
2. **`@cloudflare/realtimekit` bundle size / SSR** — verify tree-shaking and that it degrades in storybook (fake path
   must not import the real SDK eagerly).
3. **Screenshare** parity — RealtimeKit `screenShareTracks` maps to the existing screenshare atoms; confirm publish API.
4. **TURN/ICE** — RealtimeKit manages its own ICE; the current `runtime.services.iceProviders` config becomes
   Cloudflare-transport-only.
5. **Transcription cost/latency** — Deepgram Nova-3 on Workers AI vs current Whisper one-shot; validate accuracy and
   per-minute cost before default cutover.
6. **Data residency / privacy** — native transcription streams audio through Cloudflare AI Gateway; confirm this is
   acceptable vs today's edge Whisper call (also Cloudflare, so likely equivalent).
7. **Writer hand-off** — if the `MeetingPayload` owner leaves mid-meeting, elect a successor; id-dedupe covers overlap.

## 10. Out of scope (this spec)

Full RealtimeKit-meeting adoption (ceding presence), UI kit components, mobile SDKs, voice-agent (`RealtimeAgent`)
pipelines, and replacing editor/chat client-side transcription.
