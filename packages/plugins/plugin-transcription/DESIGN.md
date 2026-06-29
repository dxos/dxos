# @dxos/plugin-transcription

Thin plugin that wires live transcription into Composer: contributes the transcription capabilities,
drives the editor capture flow, and owns the `TranscriptionManager` service. The audio/ASR/UI
primitives live in peer packages.

## Related packages

| Package                        | Role                                                                                         |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| `@dxos/transcription-pipeline` | Engine (env-agnostic): `Transcriber`, `runAsrPipeline`, `Stage`, `CommitFn`, `EntityLookup`. |
| `@dxos/react-ui-transcription` | Browser + React: `MediaStreamRecorder`, `createTranscriber`, hooks, `Transcription` view.    |
| `@dxos/app-framework`          | Capability + plugin runtime (`Capability.make` / `contributes` / `get`).                     |
| `@dxos/plugin-markdown`        | Editor surface the driver attaches to (`EditorViews`, pending-text decorations).             |
| `@dxos/plugin-client`          | `ClientCapabilities.Client` — space, edge client, identity for the manager.                  |
| `@dxos/plugin-meeting`         | **Consumer** — creates a `TranscriptionManager` via the capability.                          |
| `@dxos/plugin-assistant`       | **Consumer** — reads `RecordingSession` + `Settings` for chat voice input.                   |

## Capabilities

Tokens are declared with `Capability.make` in `types/TranscriptionCapabilities.ts`, contributed by a
module under `capabilities/`, and consumed either imperatively (`capabilities.get(token)` inside other
capability modules) or reactively in React (`useAtomCapability`/`useAtomCapabilityState(token)`).

| Capability                     | Contributed by         | Consumed by                                                  | Purpose                                                                 |
| ------------------------------ | ---------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `RecordingSession`             | `recording-session.ts` | driver, `Mic`, plugin-assistant                              | Active editor session `{ id, recording }`; the `Mic` button toggles it. |
| `Settings`                     | `settings.ts`          | driver, `Mic`, `useTranscriptionRecording`, plugin-assistant | Streaming/word timing + audio device config.                            |
| `EntityLookup`                 | `entity-lookup.ts`     | driver                                                       | Resolves entity references for enrichment (backend-agnostic).           |
| `PipelineStatus`               | `pipeline-status.ts`   | driver (publishes), stories                                  | Lifecycle phase `idle → recording → draining`.                          |
| `TranscriptionManagerProvider` | `transcriber.ts`       | plugin-meeting                                               | Factory returning a `TranscriptionManager` service (see below).         |

## TranscriptionManager as a service contract

`TranscriptionManager` is a **service** (edge client + feed + identity + recorder), not UI. The concrete
`TranscriptionManagerImpl` is internal to this plugin (`transcription-manager.ts`); it is exposed only
through the `TranscriptionManagerProvider` capability as a light **interface**
(`TranscriptionCapabilities.TranscriptionManager`).

```
plugin-meeting -> get(TranscriptionManagerProvider)({ messageEnricher }) -> TranscriptionManager (interface)
                                                                               ▲ implemented by
                                                          TranscriptionManagerImpl (this plugin, internal)
```

Consumers depend on the interface, so the implementation's browser/SDK dependencies do not leak into
their packages.

## Editor capture flow

```
Mic button -> RecordingSession.recording = true
  -> TranscriptionDriver (always-mounted) reads RecordingSession + Settings + EntityLookup
  -> useRecordingPipeline (react-ui-transcription): mic -> Transcriber -> runLivePipeline -> stages
  -> pending-text decorations in the markdown editor (confirm ✓ / cancel ✕)
  -> publishes phase to PipelineStatus
```
