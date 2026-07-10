---
name: transcription
description: >-
  How DXOS produces transcripts across meetings/calls, markdown editors, and assistant chat — the
  TranscriptionManager (an enable-flag + feed sink, NOT a local recorder in meetings), the useTranscriber
  hook (the real client-side ASR), TranscriptionArticle's own record button, and native RealtimeKit
  segments. Use when touching transcription, meeting/call transcripts, TranscriptionManager,
  useTranscriber / useTranscriptionRecording, TranscriptionArticle, or RealtimeKit native transcription.
---

# DXOS transcription

Three mechanisms, **one destination**: the meeting/doc's ECHO `Transcript.Transcript`. Segments become
`Message.Message` entries appended via `Feed.append(transcript.feed, …)`. All client-side ASR shares one
engine — `Transcriber` from `@dxos/pipeline-transcription` (Whisper; base64 WAV → edge `/transcribe` via a
`TranscribeFn`).

## Read this first — the non-obvious truth

**`TranscriptionManager` does NOT capture audio or run ASR in a meeting.** Its `setAudioTrack()` has **no
production caller** (only the interface decl + stories), so its internal `Transcriber` never starts
(`_maybeRestartTranscriber` early-returns without a track). In a meeting the manager is only:

- an **enabled flag** (`enabled` atom — its only real consumers are the toolbar label and the guard inside
  `addTranscript`), plus
- a **feed binding** (`setFeed`), plus
- a **sink** for externally-produced segments via `addTranscript()` → `_onSegments` → `Feed.append`.

The **actual client-side ASR** is the **`useTranscriber`** hook — in meetings, via
**`TranscriptionArticle`'s own "Start recording" mic button** (`useTranscriptionRecording`), which is
**independent** of the manager (it never reads `manager.enabled`).

Do not assume "the manager transcribes." It doesn't produce; it gates + writes.

## The three mechanisms

### ① `TranscriptionManager` — capability, meeting-scoped (writer/sink)

- `packages/plugins/plugin-transcription/src/transcription-manager.ts`; provided as
  `TranscriptionCapabilities.TranscriptionManagerProvider`.
- Created on meeting join — `plugin-meeting/src/capabilities/call-extension.ts` (`onJoin`); enabled + feed-bound
  by a meeting **activity** (`transcriptionEnabled`, `transcriptDxn`) via `operations/handle-payload.ts`.
- `addTranscript(segments)` is the intake seam for external sources (native ③). `setAudioTrack` exists but is
  **unwired** — the local-Whisper producer path is dormant.

### ② `useTranscriber` — the real client-side ASR engine (hook)

- `packages/ui/react-ui-transcription/src/hooks/useTranscriber.ts` → `createTranscriber()` → `Transcriber`.
  Caller supplies the audio track + `onSegments` sink.
- Live consumers (all distinct product features — none is dead code):
  - **Markdown dictation** — `plugin-transcription/.../transcription-driver.tsx`, mounted app-wide via
    `addReactContextModule` (`TranscriptionPlugin.tsx`). Streams into the focused markdown editor.
  - **Standalone `Transcript` doc / meeting transcript panel** — `TranscriptionArticle` (surface for
    `Transcript.Transcript` in Article/Section) → `useTranscriptionRecording` → its own mic button.
  - **Assistant chat voice** — `plugin-assistant/.../ChatPrompt/useChatVoiceInput.ts` (`ChatPrompt.tsx`).

### ③ Native RealtimeKit — server-side ASR (added by the RealtimeKit calls PR)

- `meeting.ai.on('transcript')` → `RealtimeKitTransport.subscribeTranscripts` (→ normalized `TranscriptEvent`)
  → `CallManager.join()` **filters to own `deviceKey`** → `this.transcript.emit` → `plugin-calls/.../call-events.ts`
  broadcasts to `CallsCapabilities.EventHandler` → `plugin-meeting/.../call-extension.ts` `onTranscript`
  → `manager.addTranscript([...])` → same `meeting.transcript` feed.
- Server-side ASR on the SFU; each client writes only its own segments (the `deviceKey` filter is the de-dup —
  no writer election).

## Entrypoints (who triggers what)

| Feature                              | Entrypoint                                                                                                                               | Does the work                                                |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Meeting transcription (local, today) | `action.startStopTranscription` toolbar (`plugin-meeting/.../app-graph-builder.ts`) enables the manager + opens the transcript companion | **`TranscriptionArticle` mic button** → `useTranscriber`     |
| Meeting transcription (native)       | same toolbar enables the manager (its `enabled` flag gates `addTranscript`)                                                              | **RealtimeKit** → `CallManager.transcript` → `addTranscript` |
| Markdown dictation                   | `TranscriptionDriver` (app-wide react context)                                                                                           | `useTranscriber`                                             |
| Standalone transcript doc            | `TranscriptionArticle` mic button                                                                                                        | `useTranscriber`                                             |
| Assistant chat voice                 | `useChatVoiceInput` in `ChatPrompt`                                                                                                      | `useTranscriber`                                             |

`startStopTranscription` and the article's `toggle-recording` are **two independent controls** — the first is a
flag + feed + panel; the second actually records.

## Before vs. after the RealtimeKit PR (meetings)

- **Before:** the only working meeting transcript came from the **article's mic button** (② local Whisper).
  Enabling the manager gated nothing real (no audio track, no native source).
- **After:** native (③) segments flow through `addTranscript`, so **enabling the manager finally makes it
  produce** — server-side, all participants, no local capture, no article mic button. The PR effectively gives
  the manager a real producer for the first time.

## Data model

- Store: `meeting.transcript` (`Transcript.Transcript`); segments = `Message.Message` via `Feed.append`.
- Feed URI: `Feed.getFeedUri(feed).toString()` (renamed from `getQueueUri` in the echo Queue→Feed rename).
- Downstream consumers (unchanged): rendering (`TranscriptionArticle` feed-model), summary
  (`plugin-meeting/src/summarize.ts`), entity extraction (`linkEntities`, logic in `@dxos/assistant`).

## Gotchas / cleanup opportunities

- **Duplication:** ① and ② independently wrap the same `Transcriber`. Consolidation target: make ① a pure
  writer/sink fed by ③ for meetings; keep ② on the shared engine for editor/chat/standalone.
- **Two in-meeting record controls** (toolbar enable vs. article mic) both write the same feed — enabling the
  manager _and_ hitting the article mic can double-write locally. There is a `TODO(burdon): Remove if not
mutable` on the article's `useTranscriptionRecording` usage.
- If you need to make the manager actually capture local audio, note `setAudioTrack` is currently never called.
- **Local transcription is bound to the `TranscriptionArticle` component lifecycle.** `useTranscriptionRecording`
  stops (closes the `Transcriber`, releases the mic) when the article unmounts — closing the panel/tab or
  navigating away — and `recording` is component-local state, so it does not auto-resume. Native (③) is bound to
  the call / `CallManager` instead, so it keeps transcribing regardless of the panel. This is the main
  robustness advantage of the native path.
