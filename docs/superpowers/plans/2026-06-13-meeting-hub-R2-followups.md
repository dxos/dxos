# Meeting-as-Hub (R2) — Follow-up Issues

Tracking doc for the deferred work surfaced by the R2 "Meeting as hub" change
(`docs/superpowers/plans/2026-06-13-meeting-hub-R2.md`). Each item is independently
shippable; none block the current PR. Design reference: `packages/plugins/plugin-transcription/AUDIT.md`.

## Status of R2 itself (shipped)

- `Event` no longer carries `transcript`/`notes`/`summary`/`thread`; the `Meeting` hub owns them.
- `MeetingOperation.Create` accepts `event?: Ref<Event>` and stores it as a `Ref` (works for feed/queue
  events, unlike a relation endpoint). `getMeetingForEvent` reverse-matches `meeting.event.uri`.
- plugin-meeting contributes **Create meeting** / **Open meeting** actions onto `Event` graph nodes;
  plugin-inbox stays meeting-agnostic (no dep on plugin-meeting).
- `MeetingArticle` provisions a slim `Call` and joins via `CallsCapabilities.Manager` ("Start call").
- `EventDetails` shows the reverse meeting link.
- **Fixed in this PR:** `transcriptDxn` casing (consumer now matches the protobuf wire field, so the
  transcript feed is wired on the transcription manager); `summarizeMeeting` now delegates to
  `TranscriptOperation.Open` + `Summarize` and writes `meeting.summary`.

## Follow-ups

### 1. Cloudflare `CallTransportProvider.makeConfig` (R4)

- **What:** `Call.transport.config` is currently a placeholder (`Text.make({ content: roomId })` in
  `MeetingArticle.handleStartCall` and the story). The real provider must mint a transport config
  (Cloudflare SFU room/credentials) keyed off a stable room id.
- **Where:** `packages/plugins/plugin-calls/` (`CallsCapabilities.CallTransportProvider`); call sites
  `MeetingArticle.tsx`, `stories/EventCall.stories.tsx`.
- **Why deferred:** needs the edge/SFU provisioning contract; orthogonal to the hub model.

### 2. Meeting-aware companion precedence (R3)

- **What:** When an `Event` has a `Meeting`, the meeting-aware tabbed companion (Notes / Transcript /
  Summary) should take precedence over the vanilla inbox `Event` companion. Today the `EventCall`
  story renders the articles directly via `Surface`; precedence is not wired in the real deck.
- **Where:** plugin-meeting `react-surface`/companion resolution + companion ordering.
- **Why deferred:** depends on the companion-precedence mechanism; UX decision on tab set.

### 3. In-article create/start affordance (optional UX)

- **What:** `EventArticle`/`MeetingArticle` only expose create-meeting via the graph-node context menu
  and start-call via the MeetingArticle toolbar. An in-`EventArticle` "Create meeting" button would be
  a convenience — but it must NOT couple plugin-inbox to plugin-meeting. Likely a contributed toolbar
  slot rather than a direct import.
- **Where:** plugin-inbox `EventArticle`/`useToolbar` (slot), plugin-meeting (contribution).
- **Why deferred:** the graph path already makes the flow reachable; pure ergonomics.

### 4. Recurrence / occurrence keying on the Event↔Meeting link (R5)

- **What:** At most one `Call`/`Meeting` per actual event _occurrence_. The `Meeting.event` ref points
  at the series event; recurring events need an occurrence key (start instant / RRULE expansion) so a
  meeting attaches to the right instance.
- **Where:** `Meeting.event` (add occurrence discriminator), `getMeetingForEvent`, the create action.
- **Why deferred:** requires the recurrence model on `Event` to land first.

### 5. `summarizeMeeting` runtime hardening

- **What:** `MeetingOperation.Summarize` is now wired but assumes an `AiService` is configured at
  runtime (the transcription handler self-provides `ai.claude.model.claude-sonnet-4-0`). Add graceful
  failure / user feedback when no AI client is available, and surface progress in `MeetingArticle`.
- **Where:** `plugin-meeting/src/operations/summarize.ts`, `MeetingArticle.tsx`.

### 6. Dead-code cleanup

- **What:** `useShadowObject`/`createShadowEvent` may be unused after the Event-field removal; the stub
  `useEventToolbarActions` in `components/Event/EventToolbar.tsx` is unused (real one is `useToolbar.tsx`).
  `plugin-meeting/PLUGIN.mdl` was restored from history and may be stale.
- **Where:** plugin-inbox `hooks/`, `components/Event/`; `plugin-meeting/PLUGIN.mdl`.
- **Why deferred:** confirm no remaining references repo-wide before deleting the hook.
