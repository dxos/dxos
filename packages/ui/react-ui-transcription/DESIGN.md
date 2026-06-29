# @dxos/react-ui-transcription

Browser + React layer of the transcription stack: audio capture, ASR wiring, and the
transcript editor view.

## Related packages

- `@dxos/transcription-pipeline` — engine (env-agnostic): `Transcriber`, `runAsrPipeline`, `Stage`, `CommitFn`.
- `@dxos/plugin-transcription` — owns the `TranscriptionManager` service + capabilities.
- `@dxos/plugin-assistant`, `@dxos/plugin-meeting` — consumers.

## Pipelines

Capture → commit:

```
mic / file -> MediaStreamRecorder -> Transcriber -> runLivePipeline -> Stage[] -> CommitFn -> sink
```

Display:

```
objects -> useFeedModelAdapter -> TranscriptModel -> EditorChunkDocument -> CodeMirror
```

## Hierarchies

```
AudioRecorder (engine) <- MediaStreamRecorder
ChunkDocument          <- EditorChunkDocument
```

## Modules

- `capture/` — `MediaStreamRecorder`, `createTranscriber`.
- `model/` — `TranscriptModel`, `EditorChunkDocument`, `ChunkRenderer`.
- `hooks/` — `useAudioTrack`, `useAudioFile`, `useIsSpeaking`, `useSpeechRecognition`, `useTranscriber`, `useRecordingPipeline`, `useFeedModelAdapter`.
- `components/` — `Transcription`, `PipelineStatus`, `MicSettings`.
