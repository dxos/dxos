# @dxos/react-ui-transcription

The **browser/React layer** of the transcription stack. It binds the environment-agnostic engine
(`@dxos/transcription-pipeline`) to the DOM (mic capture, audio decode) and to React/CodeMirror
(hooks, transcript view). Plugins (`plugin-transcription`, `plugin-assistant`, `plugin-meeting`)
compose these primitives; they do not re-implement capture or rendering.

## Layering

```
@dxos/transcription-pipeline   (engine — no DOM, Worker-portable)
  AudioRecorder (interface) · Transcriber · runAsrPipeline/AsrPipeline
  Stage · CommitFn · TranscribeConfig · EntityLookup
        ▲                                   ▲
        │ implements                        │ drives
        │                                   │
@dxos/react-ui-transcription   (this package — browser + React)
  capture/    MediaStreamRecorder · createTranscriber (audio in → text)
  model/      TranscriptModel     · EditorChunkDocument · ChunkRenderer (text → editor)
  hooks/      useAudioTrack       · useAudioFile · useIsSpeaking · useSpeechRecognition
              useTranscriber      · useRecordingPipeline · useFeedModelAdapter
  components/ Transcription       · PipelineStatus · MicSettings
  util/       renderByline
        ▲
        │ compose
        │
plugins (plugin-transcription / plugin-assistant / plugin-meeting)
```

## Type hierarchy

**Capture / ASR (audio → text)** — `capture/`

- `AudioRecorder` _(engine interface)_ ← `MediaStreamRecorder` — browser mic/track → `AudioChunk` (wav).
- `Transcriber` _(engine)_ — buffers chunks, calls Whisper, emits `ContentBlock.Transcript[]`.
- `createTranscriber(CreateTranscriberOptions): Transcriber` — wires a `MediaStreamRecorder` into a `Transcriber`.
- `AsrPipeline` _(engine)_ — `Transcriber → runLivePipeline(stages) → CommitFn`, created by `runAsrPipeline`.

**Transcript document projection (text → editor)** — `model/`

- `Chunk` `{ id }` → `ChunkRenderer<T>` `(chunk) => string[]`.
- `ChunkDocument` _(interface)_ ← `EditorChunkDocument` — wraps a CodeMirror `EditorView`.
- `TranscriptModel<T extends Chunk>` — owns a chunk queue; diffs renders and syncs lines into a `ChunkDocument`.

**Lifecycle**

- `PipelinePhase = 'idle' | 'recording' | 'draining'`.

## Dataflow

**Live capture (mic or file) → enriched commit**

```
  useAudioTrack(active)            ─┐
  useAudioFile(url) → track        ─┤→ useRecordingPipeline({ active, track, stages, commit })
                                    │      └─ runAsrPipeline:
                                    │         MediaStreamRecorder → Transcriber → runLivePipeline
                                    │         → Stage[] (correct/extract/summarize…) → CommitFn → sink
                                    └─ phase: idle → recording → draining → idle
```

**Display (objects → editor view)**

```
objects (e.g. useQuery feed)
  → useFeedModelAdapter(renderByline, objects)
  → TranscriptModel<T>(ChunkRenderer)
  → EditorChunkDocument(EditorView)        (Transcription component + transcription-extension)
```

**Standalone hooks**

- `useIsSpeaking(track)` — VAD boolean.
- `useSpeechRecognition({ active, onTranscript })` — browser Web Speech API (no engine).
- `useTranscriber(opts)` — a `Transcriber` for callers that orchestrate capture themselves.

## Capability contracts (owned by `plugin-transcription`, not this package)

`TranscriptionManager` lives in `plugin-transcription` (it is a service: edge client + feed + identity,
not UI). It is exposed via the `TranscriptionManagerProvider` capability as a **light interface**
(`TranscriptionCapabilities.TranscriptionManager`) so consumers (`plugin-meeting`) depend on the
contract, not the implementation or this package's browser deps.
