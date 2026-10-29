# Test participants on EDGE

Status: design, not started. Companion to the `SetSimulatedParticipants` test seam.

## What it is for

A test or a demo asks EDGE for _N_ bot participants in a call room. Each bot joins the room the way a
person's browser does and plays a pre-recorded video as its camera and microphone. The browser under
test sees real remote peers: the real swarm, the real SFU, real pulled tracks.

`SetSimulatedParticipants` is the cheap version. It stays inside one browser and fakes the network, so
it can show a populated call with no EDGE at all. It cannot catch a bug in signalling, in the SFU
round-trip, or in how two clients agree on the participant list. Test participants can.

## How a participant joins today

A bot has to do the same three things a browser does
(`src/calls/call-swarm-synchronizer.ts`, `src/calls/util/calls-service.ts`):

1. **Be a HALO device.** The swarm is keyed by device key. A fresh identity is enough; Composer creates
   one on first run and EDGE signalling accepts it. Nothing checks space membership today.
2. **Join the swarm** on topic `md5(roomId)` through EDGE signalling (`NetworkService.joinSwarm`), with a
   `UserState` protobuf (name, joined, speaking, track names) in the peer's `state`.
3. **Push tracks to the SFU.** It opens an `RTCPeerConnection`, then `POST /calls/rtc/sessions/new` and
   `POST /sessions/{id}/tracks/new?PUSHING` with an SDP offer, through EDGE's calls proxy. It
   publishes the resulting `sessionId/trackName/mid` names in its `UserState`, and every other client
   pulls them.

Speaking is self-reported: each client measures its own microphone and sets `UserState.speaking`.
So a bot must report it too. Its timeline is known in advance, so it can be scripted rather than
measured.

## Proposal

A Node bot, run in a Cloudflare Container that a Durable Object manages, behind a dev-only EDGE
endpoint.

| Piece                               | Where                     | Notes                                                                                                                                                                                        |
| ----------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `call-bot` (Node CLI)               | this repo, `tools/`       | `@dxos/client` in Node for identity and swarm; a WebRTC stack with media for the push. Runs on a laptop first.                                                                               |
| Media library                       | R2                        | One track per participant, pre-encoded VP8 (IVF) and Opus (Ogg), so the bot sends packets without decoding or transcoding. `conversation.mjs` writes WebM today; IVF/Ogg is one more output. |
| `POST /calls/test-participants`     | `dxos/edge` calls service | Starts a run: `{ roomId, participants: [{ name, media }], ttlSeconds }` → `{ runId, participants: [{ name, deviceKey }] }`. `DELETE /…/{runId}` ends it.                                     |
| `TestParticipantRun` Durable Object | `dxos/edge`               | Holds one run: starts a container per bot (or one container for the run), enforces the TTL, tears down on `DELETE` or expiry.                                                                |
| `AddTestParticipants` operation     | plugin-calls, dev only    | Calls the endpoint for the current room, so a Playwright spec or an autocue flow asks for bots in one step.                                                                                  |

### Why Node, not headless Chromium

A container running Chromium would reuse `CallManager` unchanged, `fake-media.mjs` included. But each
bot then costs about 1 GB and a 10-second cold start, and a four-person call needs three of them.
`CallManager` is DOM-bound only at its edges: `MediaManager` needs `getUserMedia` and the speaking monitor.
`CallsServicePeer` is plain W3C `RTCPeerConnection` plus `fetch`. So the bot can reuse
`CallSwarmSynchronizer` and `CallsServicePeer` almost as they are, over a Node WebRTC implementation.

- `node-datachannel` is already a workspace dependency (mesh uses it for data channels). Its W3C polyfill
  sends media only partially, so check first that it can push a VP8 track to the SFU.
- `werift` is the fallback: pure TypeScript, with W3C-shaped media APIs and RTP from files.

### Starting together

All bots must start on the same frame, and the browser under test must start then too, so they stay
in step with the script. Use the call's own activity CRDT. The test runner sets activity key
`org.dxos.test.cue` with a start time, and every bot begins playback at that time. This needs no new
API, and it works the same for one bot or ten.

### Guard rails

- Only on dev and preview EDGE, behind a feature flag. Production rejects the route.
- Only an authenticated identity may start a run. It is rate-limited per identity, with at most 4 bots
  and 10 minutes per run.
- Bots leave the swarm and close their SFU sessions when the run ends. The 10-second abrupt-disconnect
  grace in `CallSwarmSynchronizer` hides a bot that crashes, so the Durable Object must also delete
  dangling sessions.
- If calls gain access control (see the `TODO: Handle access control` in `calls-service.ts`), the run
  request must carry a space invitation, and each bot redeems it before it joins.

## Phases

1. **`call-bot` on a laptop.** One bot joins a real room on dev EDGE and pushes one clip, while a person
   watches in Composer. This proves the WebRTC stack against Cloudflare Calls, which is the main risk.
2. **Scripted speaking and the cue.** Four bots play the Fieldstone conversation in step. The autocue
   flow drives the browser under test against them, and is recorded the same way as the simulated version.
3. **EDGE endpoint and container.** The Durable Object, R2 media, guard rails and the plugin-calls
   operation. Playwright specs can then ask for bots in CI's merge queue.

## Open questions

1. Can a Cloudflare Container reach Cloudflare Calls over UDP? If not, the bot needs TURN over TLS,
   and composer's config sets no `runtime.services.ice` today.
2. Should one container run every bot of a run (cheaper, one cold start) or one each (isolated)?
   Start with one per run.
3. Is a bot a space member in the participant list, or marked as a bot? The `UserState` proto has no
   field for it. A name suffix is enough for a test, but a demo shows names.
