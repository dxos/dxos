# plugin-recorder — record a presentation's voice-over

## Intent

Turn the throwaway voice prompter (`screen-recordings-grid-zoom` worktree, `temp/voice/`) into Composer
functionality. A reader writes a deck in plugin-presenter, writes each slide's speaker notes as the script,
and records a voice-over (and optionally a screen or camera video) while presenting the deck. Takes are
stored as plugin-studio `MediaArtifact` variants. The prototype proved the workflow on two demo videos; this
makes it repeatable, versioned in ECHO, and usable without a local Node server.

## Decisions (user)

| #   | Date  | Decision                                                                                                                                                                                      |
| --- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 10-25 | Package name `plugin-recorder` (`@dxos/plugin-recorder`, private).                                                                                                                            |
| 2   | 10-25 | Post-processing (trim, stretch, mux, loudness) runs on native ffmpeg in two places: an EDGE compute operation (Cloudflare Container) and the desktop app (Tauri sidecar). Not in the browser. |
| 3   | 10-25 | Video capture is screen + camera overlay. Room is kept for other picture sources: autocue videos, plugin-canvas animations, plugin-presenter decks.                                           |
| 4   | 10-25 | plugin-presenter is the harness for the script (slides). Presenter gains the functionality; the recorder builds on it.                                                                        |
| 5   | 10-25 | Section times are stored with the recording and edited in the UI when the script carries none.                                                                                                |
| 6   | 10-25 | This PR is phase 1. The voiced video (post-processing) is a later PR.                                                                                                                         |
| 7   | 10-25 | The project is tracked here (`docs/TASKS.md`, this file) with a registry entry.                                                                                                               |
| 8   | 10-26 | plugin-presenter displays speaker notes while presenting. A presenter setting chooses where: a separate window, or subtitles over the presented slide.                                        |
| 9   | 10-26 | plugin-recorder adds a toolbar item to the presenter that starts the presentation and records its voice-over.                                                                                 |
| 10  | 10-26 | Each slide has a field for its desired length.                                                                                                                                                |
| 11  | 10-26 | plugin-recorder has settings to choose the microphone and the video source, and to test the microphone.                                                                                       |

## Goals (prototype behaviour, in order of importance)

1. Script-driven sections: the current slide's notes shown large, one line per bullet/sentence; the next
   slide's notes previewed (notes window).
2. The section being read stays on screen until Next; text is never time-driven. The deck's own keys are
   Next and Previous.
3. The desired length of each slide is shown against the time spent on it, so the reader can pace; each take
   logs every slide's real start and end.
4. Mic: picker (prefer a device matching `/shure/i`), live peak meter (-60..0 dBFS, target band -12..-3, CLIP
   above -1, peak hold 1.5s), NO SIGNAL after 2s of digital silence, `AudioContext` created inside the click,
   `echoCancellation`/`noiseSuppression`/`autoGainControl` off.
5. Takes are never overwritten: each take is a new `Variant`, named by timestamp.
6. Compact controls: icon-only, one height, tooltips.

## Non-goals (phase 1)

- Post-processing and the voiced video (phase 2).
- The camera overlay composited onto a screen capture (phase 3); phase 1 records one video source.
- Voicing an existing video with gated playback and fitted rates (the prototype's other mode) — a later picture
  source.
- Transcribing the take or aligning it to the script.

## Anti-goals

- Time-driven text that flickers or runs ahead of the reader.
- Any path that overwrites or loses a take.
- A second media model next to plugin-studio's, or a second script format next to plugin-presenter's.
- A dependency from plugin-presenter on plugin-recorder: presenter exposes extension points; the recorder uses
  them.

## plugin-presenter additions

| Addition                                           | Detail                                                                                                                                                                                                                                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Slide.duration?: number`                          | Desired length in seconds. Edited with the slide's other properties.                                                                                                                                                                                                                  |
| `getSpeakerLines(notes)`                           | Splits speaker notes into lines: one per bullet, long ones after `.`, `!`, `?`. Pure, tested.                                                                                                                                                                                         |
| Settings `notes: 'off' \| 'subtitles' \| 'window'` | Where speaker notes show while presenting; default `off`.                                                                                                                                                                                                                             |
| Subtitles                                          | While presenting, the current slide's notes overlay the bottom of the slide.                                                                                                                                                                                                          |
| Notes window                                       | While presenting, a second browser window (a React portal into `window.open`, so it shares the app's state) shows the current slide's notes large, the next slide's notes below, and the elapsed time against the slide's desired length. A blocked popup offers a button to open it. |
| `PresenterSurface.Toolbar`                         | Surface slot in the Presentation toolbar; data `{ subject: Presentation }`.                                                                                                                                                                                                           |
| `PresenterSurface.Overlay`                         | Surface slot over the presented deck; data `{ subject: Presentation }`.                                                                                                                                                                                                               |
| `PresenterCapabilities.PresentationEventHandler`   | Callbacks fired by the presented deck: `onStart`, `onSlide({ slide, index, step })`, `onStop`.                                                                                                                                                                                        |
| Public subpaths                                    | `./PresenterSurface`, `./PresenterCapabilities`, `./PresenterSettings`, and the speaker-notes helpers.                                                                                                                                                                                |

The speaker notes of a slide are `Slide.notes` (a `Text`); for an owned markdown slide without them, the
slide's notes comment.

## plugin-recorder

### Model

```
Presentation (plugin-presenter)
      ▲ presentation
      │
Recording ── audio? ──► MediaArtifact{kind:'audio'}   (owned; variants = audio takes)
          └─ video? ──► MediaArtifact{kind:'video'}   (owned; variants = video takes)

Variant (one per take): contentType audio/webm | video/webm, content Ref<File>,
  config: { sections: [{ slide, title, start, end }], steps: [{ slide, step, at }], duration, device, source }
```

- **`Recording`** (`org.dxos.type.recording`): `{ name?, presentation: Ref<Presentation>, audio?:
Ref<MediaArtifact>, video?: Ref<MediaArtifact> }`. Created on the first take of a presentation; later takes
  reuse the most recently created Recording for that presentation.
- A take is a studio `Variant`; its timeline rides in `Variant.config`. Times are seconds on the take's own
  clock. A section is a slide, logged by Slide id.
- **plugin-studio change**: a default `audio/*` `VariantRenderer`.

### Settings

`{ audioInput?: string; videoSource: 'none' | 'screen' | 'camera'; videoInput?: string }`. A custom settings
surface lists the devices and has a Test microphone control with the level meter.

### Flow

1. The Record button (in `PresenterSurface.Toolbar`) is clicked. Inside the click: create the `AudioContext`,
   `getUserMedia` (the chosen mic, processing off), and `getDisplayMedia` or the camera when a video source is
   set.
2. The recorder service starts the `MediaRecorder` and asks the presenter to present from the first slide.
3. `onSlide` closes the previous section and opens the next. The overlay (`PresenterSurface.Overlay`) shows
   REC, the elapsed time and the level meter, with NO SIGNAL / CLIP warnings.
4. `onStop` (Escape, or the deck ends) stops the recorder. The take is saved: the bytes become a `File` via
   `FileOperation.Create`, a `Variant` (named by timestamp) is appended to the Recording's artifact and made
   its cover.
5. If saving fails, the take stays in memory and the overlay/toolbar offers Retry and Save file.

The recorder service is a capability (not a component), because the toolbar unmounts while the deck is
presented.

### Components

| Component                      | Role                                                                                         |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| `LevelMeter`                   | Peak bar, peak-hold marker, dB readout, CLIP, NO SIGNAL. Pure props.                         |
| `RecordButton` (container)     | The toolbar item.                                                                            |
| `RecordingOverlay` (container) | REC indicator, time, meter while presenting.                                                 |
| `RecorderSettings` (container) | Device pickers, video source, Test microphone.                                               |
| `RecordingArticle` (container) | A Recording's takes: play each, and each slide's recorded length against its desired length. |

Pure logic, tested without a browser: dB math and the silence detector (`level.ts`), the take timeline
(`timeline.ts`: sections from slide events), device preference (`devices.ts`).

### Picture sources (decision 3)

The deck is the only source in phase 1. The take timeline is source-neutral (sections keyed by an id, times on
the take clock), so a later `PictureSource` capability (an autocue video with gated playback, a canvas
animation) logs the same shape.

## Later phases

2. **Voiced video** (decision 2): a pure TypeScript planner turns a take's timeline and the slides' desired
   lengths into an ffmpeg invocation (trailing-silence trim, per-section stretch, cut fades, `loudnorm` to
   -16 LUFS — the prototype's `voice-mux.mjs`), run by an EDGE operation and by a Tauri sidecar.
3. **Screen + camera overlay** in one take.
4. **More picture sources** through `PictureSource`.

## Verification (phase 1)

- Unit: speaker lines, timeline, level math, device preference, the Recording/take model.
- Storybook: `LevelMeter`, the notes window and subtitles, `RecordingArticle`, `RecorderSettings`. The built-in
  browser pane blocks the microphone; mic paths are verified in Chrome or listed as unverified.
- `PLUGIN.mdl` for plugin-recorder (with `## QA` and `## Changelog`); presenter's and studio's `PLUGIN.mdl`
  record their additions.

## Calls made by the agent (review these)

| #   | Call                                                                                                                                                                                         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | A failed save keeps the take in memory with Retry and Save file. Buffering chunks in IndexedDB (to survive a tab crash) is deferred to `TASKS.md`.                                           |
| A2  | One PR for phase 1, holding the presenter additions, the studio audio renderer and the recorder. It reverses presenter decision D-8 ("presenter view deferred").                             |
| A3  | Recording starts with the presentation; there is no hold before the first slide, since a deck has no lead-in.                                                                                |
| A4  | Several Recordings may exist per presentation; Record uses the most recent one.                                                                                                              |
| A5  | The notes window is a portal into `window.open`, so it shares one React tree and app state with the deck. In the desktop app, where a webview may refuse popups, subtitles are the fallback. |
| A6  | The video source records one stream (screen or camera); the overlay of both is phase 3.                                                                                                      |
