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

## Schema

| Type       | Field | Purpose | Note                                                      |
| ---------- | ----- | ------- | --------------------------------------------------------- |
| Event      |       |         |                                                           |
| Channel    |       |         |                                                           |
| Thread     |       |         | Conflicts with Channel?                                   |
| Meeting    |       |         | Change to Call and merge plugin-meeting with plugin-calls |
| Segment    |       |         |                                                           |
| Transcript |       |         |                                                           |

## Relations

| Type       | Source  | Target | Purpose |
| ---------- | ------- | ------ | ------- |
| AnchoredTo | Call    | Event  |         |
| AnchoredTo | Segment | Event  |         |

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
