# plugin-transcription Audit

Cross-plugin integration audit for the transcription/meeting/calls/inbox cluster.

## Plugin Dependency Graph

```
plugin-calls
    ↑  CallsCapabilities.EventHandler (implemented by plugin-meeting)
    │
plugin-meeting ──→ plugin-transcription
    │                  TranscriptionCapabilities.TranscriptionManagerProvider
    │                  TranscriptionCapabilities.TranscriberProvider
    │
plugin-inbox  (standalone — no dependency on the other three)
```

| Plugin                 | Package                      | Depends On                                         |
| ---------------------- | ---------------------------- | -------------------------------------------------- |
| `plugin-calls`         | `@dxos/plugin-calls`         | (none)                                             |
| `plugin-transcription` | `@dxos/plugin-transcription` | `@dxos/plugin-calls` (CallsCapabilities only)      |
| `plugin-meeting`       | `@dxos/plugin-meeting`       | `@dxos/plugin-calls`, `@dxos/plugin-transcription` |
| `plugin-inbox`         | `@dxos/plugin-inbox`         | (none)                                             |

## Cross-Plugin Capability Contracts

| Provider               | Namespace                   | Capability                     | Implemented By                         |
| ---------------------- | --------------------------- | ------------------------------ | -------------------------------------- |
| `plugin-calls`         | `CallsCapabilities`         | `EventHandler`                 | `plugin-meeting` (`call-extension.ts`) |
| `plugin-transcription` | `TranscriptionCapabilities` | `TranscriberProvider`          | (self — `transcriber.ts`)              |
| `plugin-transcription` | `TranscriptionCapabilities` | `TranscriptionManagerProvider` | (self — `transcriber.ts`)              |

## ECHO Type Relationships

```
Event (sdk/types)
  ├── notes?      → Ref<Text>         ← created lazily in EventArticle
  ├── summary?    → Ref<Text>         ← not wired on Event (only on Meeting)
  ├── transcript? → Ref<Transcript>   ← not wired on Event (only on Meeting)
  └── thread?     → Ref<Thread>       ← NOT WIRED (schema-only)

Meeting (plugin-meeting/types)
  ├── notes?      → Ref<Text>         ← created by MeetingOperation.Create
  ├── summary?    → Ref<Text>         ← written by MeetingOperation.Summarize
  └── transcript? → Ref<Transcript>   ← created by MeetingOperation.Create; populated by plugin-transcription

Transcript (sdk/types)
  └── feed → Ref<Feed>                ← Feed contains Message objects streamed by TranscriptionManager
```

## Field Wiring Status

### `Event.transcript`

- **Type:** `Ref<Transcript>` (optional)
- **Written:** not set on `Event` anywhere; `Meeting` has the parallel field and uses it
- **Read:** not read from `Event`; plugin-inbox `EventArticle` does not surface transcript
- **Status:** schema slot exists, not wired in plugin-inbox

### `Event.notes`

- **Type:** `Ref<Text>` (optional)
- **Written:** `EventArticle.tsx` — created lazily on first open (`event.notes = Ref.make(Text.make())`)
- **Read:** `EventArticle.tsx`, `summarize.ts` (concatenated with transcript for AI summarization)
- **UI:** rendered as a `Section` surface in `EventArticle`
- **Status:** wired

### `Event.summary`

- **Type:** `Ref<Text>` (optional)
- **Written:** not set on `Event`; only `Meeting.summary` is written by `MeetingOperation.Summarize`
- **Read:** not read from `Event`; `MeetingArticle` reads `Meeting.summary`
- **Status:** schema slot exists, not wired in plugin-inbox

### `Event.thread`

- **Type:** `Ref<Thread>` (optional)
- **Written:** nowhere
- **Read:** nowhere
- **UI:** none
- **Status:** not wired; `Thread` type has `messages`, `status`, and `AgentConfig` — reserved for future async discussion

## Call → Meeting → Transcription Data Flow

1. User joins a call (Channel) — `CallsCapabilities.Manager.joinedAtom` becomes true
2. plugin-meeting `callCompanion` extension shows Meeting selector as companion
3. User starts transcription — `MeetingOperation.Create` creates `Meeting` + `Transcript` + `Feed`
4. plugin-meeting `callTranscript` extension calls `callManager.setActivity({ meetingId, transcriptDxn })` to broadcast active meeting to all call peers
5. `CallsCapabilities.EventHandler.onMediaStateUpdated` passes the local audio track to `TranscriptionManager`
6. `TranscriptionManager` drives the `Transcriber`: audio chunks → Whisper → `Message` objects → appended to `Feed`
7. All peers receive Feed updates via ECHO sync; `MeetingArticle` renders the live transcript
8. On call end, `CallsCapabilities.EventHandler.onLeave` closes `TranscriptionManager`

## Operations

| Operation                                   | Plugin               | Input                  | Output       | Notes                                                                     |
| ------------------------------------------- | -------------------- | ---------------------- | ------------ | ------------------------------------------------------------------------- |
| `TranscriptOperation.Create`                | plugin-transcription | `space`, `name?`       | `Transcript` | Creates Feed + Transcript                                                 |
| `TranscriptOperation.Open`                  | plugin-transcription | `Ref<Transcript>`      | `string`     | Loads Feed, renders with bylines                                          |
| `TranscriptOperation.Summarize`             | plugin-transcription | `transcript`, `notes?` | `string`     | Claude Sonnet; markdown summary                                           |
| `TranscriptOperation.SentenceNormalization` | plugin-transcription | `Message[]`            | `Message[]`  | Pure; no effects                                                          |
| `MeetingOperation.Create`                   | plugin-meeting       | `space`, `channel?`    | `Meeting`    | Creates Meeting + transcript + notes + summary refs                       |
| `MeetingOperation.Summarize`                | plugin-meeting       | `Meeting`              | —            | Calls `TranscriptOperation.Summarize`; writes result to `Meeting.summary` |
| `MeetingOperation.SetActive`                | plugin-meeting       | `Meeting?`             | —            | Updates `MeetingCapabilities.State` atom                                  |
| `MeetingOperation.HandlePayload`            | plugin-meeting       | `payload`              | —            | Syncs active meeting from call activity broadcast                         |

## Domain model (target)

`Event → Meeting → Call`, with the **Meeting as the hub**. One plugin owns both Meeting and Call.

```
Event (sdk/types; synced, may recur, may carry external video links e.g. Zoom/Meet)
  └─ AnchoredTo (occurrence-keyed) ─ Meeting        # at most one Meeting per event occurrence
Meeting (hub; the human gathering — in-person, phone, video, or not-yet-happened)
  ├── notes?      → Ref<Text>        # prep/agenda/notes; exists before any call
  ├── summary?    → Ref<Text>        # AI summary
  ├── transcript? → Ref<Transcript>  # hangs off the Meeting (works in-person/external too)
  ├── call?       → Ref<Call>        # at most one; provisioned ahead; resumable
  └── participants
Call (slim session/room; persistent so the "where" is known ahead of time)
  └── transport: { kind, config }    # room/link + reconnection; live state is runtime (CallManager)
Transcript (sdk/types)
  └── feed → Ref<Feed>
```

- **At most one Call per occurrence.** Stop→restart = the same Call (stable room).
- **Provision ahead:** a Call (room/link) can be created when the meeting is prepped, before anyone joins.
- **In-progress:** runtime `CallManager` reports whether the Call's room is live → "join" affordance.

### Attaching a Meeting (the single primitive)

A naked `Event` has no `Meeting`. **"Attach Meeting"** is the one creation action — create the
`Meeting` hub + `AnchoredTo`(Event, occurrence) + an empty `notes` `Text` (≤1 per occurrence; reused
after). Three intents all funnel through it (create-or-reuse):

| Intent | Action | Effect on the hub |
| --- | --- | --- |
| (a) Planning | Attach meeting / open Notes | `Meeting` + `notes`; edit `Meeting.notes`. |
| (b) In-person notes | Attach meeting / open Notes | same — notes without any `Call`. |
| (c) Plan/start a call | Attach meeting → provision call | `Meeting` + `Meeting.call` (room/link ahead); join via `CallManager`. |

Transcript and summary attach to the `Meeting` as used. Attaching a Meeting is also what flips the
Event companion from the vanilla inbox view to the Meeting-aware tabbed companion (precedence).

## Schema

| Type         | Owner        | Key fields                                                                           | Note                                                        |
| ------------ | ------------ | ------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| `Event`      | sdk/types    | `description`, `startDate`/`endDate`, `recurrence?`, attendees, external video links | Synced; the schedule.                                       |
| `Meeting`    | calls plugin | `notes?`, `summary?`, `transcript?`, `call?`, participants                           | **Hub.** Renamed back from P1's `Call`-as-hub.              |
| `Call`       | calls plugin | `transport: { kind, config }`                                                        | Slim room/session; ≤1 per Meeting; resumable.               |
| `Transcript` | sdk/types    | `feed → Ref<Feed>`                                                                   | Hangs off the Meeting.                                      |
| `Channel`    | sdk/types    | `backend: { kind, config }`                                                          | Pluggable backend (Feed default). See Thread/Channel merge. |
| `Thread`     | sdk/types    | `status`, `messages: Ref<Message>[]`, `agent?`                                       | Merge candidate with Channel.                               |
| `Segment`    | plugin-trip  | `details` (Flight/Train/…), `booking?`                                               | `AnchoredTo` Event.                                         |

## Relations

| Type         | Source    | Target  | Key                          | Purpose                                           |
| ------------ | --------- | ------- | ---------------------------- | ------------------------------------------------- |
| `AnchoredTo` | `Meeting` | `Event` | `occurrence` (RECURRENCE-ID) | The meeting for a specific event occurrence (≤1). |
| `AnchoredTo` | `Segment` | `Event` | —                            | A trip segment (e.g. flight) tied to an event.    |

## Surfaces

A **main** plank pairs with a **companion**. The companion shows the `Event`; if that Event has a
linked `Meeting`, a richer Meeting-aware companion takes precedence (see below).

| Surface                   | Owning plugin                               | Renders                             | Main / Companion | Notes                                                                                             |
| ------------------------- | ------------------------------------------- | ----------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------- |
| `CalendarArticle`         | `plugin-inbox`                              | `Calendar`                          | Main             | Calendar grid + event stack; navigation root.                                                     |
| `CallArticle`             | `plugin-calls`                              | `Call` (live session)               | Main             | **Changed:** the live video/participant grid (was the notes+summary record view). Alternate main. |
| Event companion (vanilla) | `plugin-inbox`                              | `Event`                             | Companion        | Header, description, attendees. Matches **every** Event.                                          |
| Event companion (meeting) | `plugin-meeting`                            | `Event` + `Meeting`                 | Companion        | Higher priority; filter gated on "Event has a linked `Meeting`". Adds tabs (below).               |
| `TranscriptionArticle`    | `plugin-transcription`                      | `Transcript` (`Meeting.transcript`) | tab / companion  | Live transcript feed.                                                                             |
| `SummaryArticle`          | `plugin-transcription`                      | `Text` (`Meeting.summary`)          | tab / companion  | AI summary.                                                                                       |
| Notes                     | `plugin-markdown` editor on `Meeting.notes` | `Text`                              | tab              | Meeting notes doc (tied to `Meeting`, not a loose `Text` on the Event).                           |

### Companion precedence (vanilla vs meeting)

Most events are not meetings, so by default the companion is the **vanilla `plugin-inbox` Event**
(header, description, attendees). When an Event has a linked `Meeting`, `plugin-meeting` contributes
a **higher-priority** Event companion whose filter requires a linked `Meeting`; with `limit={1}` it
wins and renders instead — same Event header/description, plus a tab strip:

```
[ Notes · Transcript · Summary ]      # Meeting.notes / Meeting.transcript / Meeting.summary
```

- `Event.description` stays in the Event header (synced; read-only unless draft).
- `Notes` is a **tab** (the `Meeting.notes` markdown editor), not a body toggle.
- plugin-inbox stays meeting-agnostic; plugin-meeting augments via precedence.
- The same Meeting companion attaches to both the **Event** node and the **Call** node (resolving the
  owning Meeting via `Meeting.call`), so it appears alongside the calendar grid or the live call.

## Gaps / Issues

| #   | Area                   | Description                                                                                                                                              |
| --- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `Event.transcript`     | Schema field defined; not wired in plugin-inbox. `EventArticle` has no transcript companion.                                                             |
| 2   | `Event.summary`        | Schema field defined; plugin-inbox has no generate/regenerate summary UI.                                                                                |
| 3   | `Event.thread`         | Schema field defined; `Thread` type has agents/status but zero wiring in any plugin.                                                                     |
| 4   | `Event` ↔ `Meeting`    | No link between a calendar `Event` and the `Meeting` created during a call on that event.                                                                |
| 5   | Sentence normalization | `TranscriptOperation.SentenceNormalization` requires a real Feed + `FeedService` runtime; disabled in stories (`FileTranscription.stories.tsx:101-103`). |
| 6   | Entity extraction      | `LiveTranscription` story's NER variant disabled (`LiveTranscription.stories.tsx:143-153`) due to HuggingFace quota issues.                              |
| 7   | Thread/Channel         | These types overlap/are redundant                                                                                                                        |
