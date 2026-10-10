# plugin-handpan — Design

Status: Phase 1 implemented (2026-10-10).

## Goal

Record music notation in a bar grid and transcribe it from live audio. The analysis
layer is general-purpose (any pitched instrument); the first instrument profile, the
notation view and calibration target the **handpan**.

## Phases

| Phase | Deliverable                                                                                                      |
| ----- | ---------------------------------------------------------------------------------------------------------------- |
| 1     | Plugin skeleton, audio analysis utility (`src/audio`), `Tuner` component + storybook: **Calibrate** and **Live** |
| 2     | ECHO schema (`Song` / `Segment` / `Bar`), notation grid editor, article surface                                  |
| 3     | Record mode: onsets + tempo estimate → quantized hits written into bars                                          |
| 4     | Polyphony (two-note strikes), other instrument profiles                                                          |

## Audio analysis (`src/audio`)

Pure TypeScript DSP functions (unit-tested on synthesized signals) behind a thin
Web Audio capture boundary. No React, no app-framework.

### Pipeline

```text
mic / synth ──► AudioWorklet tap (Blob-URL module, 512-sample blocks)
                  │
                  ▼
               Analyzer.push()   frame 2048, hop 512, Hann, 4× zero-padded FFT
                  ├─► OnsetDetector   spectral flux, adaptive median threshold, refractory window
                  ├─► MPM (`pitchy`)  per-frame f0 + clarity (live tuning meter)
                  └─► after an onset, for 40–120 ms:
                        residual = max(0, |X| − |X_pre-onset|)     ← removes notes still ringing
                        harmonic-sum f0 on residual (Σ m(k·f0)/k), harmonicity + energy gates
                        MPM used for precision when it agrees (`precise`)
                  ▼
               NoteEvent { time, frequency?, clarity, velocity, partials, percussive, precise }
                  ▼
               classifyNote()    nearest calibrated template (± octave candidates)
```

### Techniques considered

| Technique                                | Use                                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **MPM** (McLeod; Tartini, `pitchy`)      | **Chosen** for f0. NSDF peak picking resists octave errors; small, MIT.                          |
| YIN (`pitchfinder`)                      | Alternative f0; comparable accuracy, slightly more octave-prone on handpan's 1:2:3 partials.     |
| Harmonic Product Spectrum                | Cheap FFT cross-check; poor resolution at low notes (D3 ≈ 147 Hz) without long windows.          |
| **Spectral flux onsets** (aubio/librosa) | **Chosen**. Handpan strikes have sharp attacks; adaptive threshold handles varying dynamics.     |
| Partial-template matching                | **Chosen** for classification after calibration: each note's partial energy profile (f, 2f, 3f). |
| essentia.js / aubio.js                   | Rejected: AGPL/GPL and heavy WASM.                                                               |
| basic-pitch / CREPE (TF.js)              | Deferred to Phase 4 (polyphony); heavy model download.                                           |

### Handpan specifics

- Each tone field is tuned to fundamental, octave and compound fifth (1 : 2 : 3), so a
  naive autocorrelation often reports 2f. MPM plus the calibrated template resolves it.
- Notes sustain and overlap; we detect the **newest onset**, not a sustained mixture.
- **Known limit:** a note struck within ~1 semitone of one still ringing (e.g. A3 → Bb3) is
  identified correctly, but its cents are biased (the two Hann main lobes overlap), so the event
  is flagged `precise: false` and the UI hides its cents.
- Slaps/taks are broadband with low clarity → classified as percussive hits, not notes.

### Calibration

For the selected `Scale`, the user strikes each note (ding first) N times (default 3).
Per note we store the median f0 and a normalized partial profile. Calibration is
rejected per strike if clarity < threshold or f0 is > 100 cents from the expected
equal-temperament pitch. Result: `Calibration { scale, notes: NoteTemplate[] }`.

## Music model (general)

```text
Song     { name, key: Scale, timeSignature, tempo, segments: Segment[] }
Segment  { name, key?, timeSignature?, bars: Bar[] }
Bar      { key?, timeSignature?, subdivision, hits: Hit[] }
Hit      { position (subdivision index), pitch?: Pitch, articulation: 'note' | 'tak' | 'slap' | 'ghost', duration? }
Scale    { name, ding?: Pitch, notes: Pitch[] }        // e.g. D Kurd: D3 | A3 Bb3 C4 D4 E4 F4 G4 A4
Pitch    scientific pitch string ('Bb3'); MIDI number derived
```

Key and time signature resolve by inheritance Bar → Segment → Song. Pitches are
stored as absolute pitches so the model is instrument-neutral; the handpan **view**
renders them as numbered notes (D = ding, 1…n ascending) plus `T`/`S` marks.

## Phase 1 UI

- `HandpanLayout` — top-down SVG pan: ding centre, tone fields zig-zag ascending from the bottom;
  highlights the calibration target, the last note played, and per-note calibration progress.
- `NoteDisplay` — handpan label + pitch, ±50 cent meter, frequency and clarity.
- `Tuner` — toolbar (Start/Stop, scale, Calibrate/Live, Tak, reset) over the two components and a
  history strip. `useNoteAnalyzer` owns the audio session; `start()` must run inside the click,
  because browsers only start an `AudioContext` (and grant the microphone) on a genuine gesture.

Stories: `Calibrate`, `Live` (microphone), `SimulatedCalibrate`, `SimulatedLive`, and
`SimulatedSession` (numbered manual steps). The headless story runner cannot exercise audio:
`storybook/test`'s `userEvent` dispatches synthetic events, which carry no user activation, so the
`AudioContext` stays suspended. DSP behaviour is covered by node tests on synthesized audio.

## Package placement

DSP lives in the plugin under `src/audio` for now; it has no plugin dependencies so it
can be extracted to a shared `@dxos/audio-analysis` package once a second consumer exists.
