# plugin-handpan — Design

Status: Phase 1 implemented (2026-10-10).

## Goal

Record music notation in a bar grid and transcribe it from live audio. The analysis
layer is general-purpose (any pitched instrument); the first instrument profile, the
notation view and calibration target the **handpan**.

## Phases

| Phase | Deliverable                                                                                                |
| ----- | ---------------------------------------------------------------------------------------------------------- |
| 1     | Plugin skeleton, audio analysis (`src/audio`), `Tuner` + storybook: **Calibrate**, **Live**, chords (done) |
| 2     | Notation grid editor and article surface on `plugin-sequencer`'s `Score` (see Music model)                 |
| 3     | Record mode: onsets + tempo estimate → quantized hits written into bars                                    |
| 4     | Real-instrument chord validation, other instrument profiles                                                |

## Audio analysis (`src/audio`)

Pure TypeScript DSP functions (unit-tested on synthesized signals) behind a thin
Web Audio capture boundary. No React, no app-framework.

### Pipeline

```text
mic / synth ──► AudioWorklet tap (Blob-URL module, 512-sample blocks)
                  │
                  ▼
               Analyzer.push()   frame 2048, hop 512, Hann, 4× zero-padded FFT
                  ├─► OnsetDetector   spectral flux on a peak-normalized spectrum (level-independent),
                  │                   adaptive median threshold, 100 ms minimum between strikes
                  ├─► MPM (`pitchy`)  per-frame f0 + clarity (live tuning meter)
                  └─► per onset, once 30 ms + 8192 samples have elapsed (~200 ms):
                        residual = max(0, |X_after| − |X_before|)   ← equal long windows either
                                                                       side of the onset; removes
                                                                       notes still ringing
                        harmonic-sum f0 on residual (Σ m(k·f0)/k), harmonicity + energy gates
                        a following onset cuts the window short (≥1024) → `precise: false`
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
- A 2048-sample frame (~46 ms) cannot separate neighbouring low notes (±43 Hz main lobe vs
  D4–E4 36 Hz apart): magnitude subtraction and MPM both read 20–30¢ flat. Note events therefore
  use 8192-sample windows (±11 Hz), measured within 0.5¢ with notes 0.3 s apart. Cost: an event
  arrives ~200 ms after the strike; the live meter (MPM per frame) is immediate.
- Calibration rejects strikes cut short by the next onset (`imprecise`): too coarse for a reference.
- Strike detection normalizes the spectrum by a slowly decaying recent peak, so a distant
  microphone (−30 dBFS strikes) detects like a close one. Absolute thresholds missed every strike
  below ~−20 dBFS. Strikes at −40 dBFS over a −66 dBFS noise floor are partly missed (known limit).
- A strike's attack and its tone blooming behind it register as two onsets; onsets within 100 ms
  of the previous one are ignored, otherwise the attack resolves as a spurious tak.

### Calibration

For the selected `Scale`, the user strikes each note (ding first) N times (default 3).
Per note we store the median f0 and a normalized partial profile. Calibration is
rejected per strike if clarity < threshold or f0 is > 100 cents from the expected
equal-temperament pitch. Result: `Calibration { scale, notes: NoteTemplate[] }`.

### Chords (spike, 2026-10-10)

Two layers, of which the first is prototyped:

1. **Simultaneous strikes** — `ChordDecomposer` (`src/audio/chord.ts`) explains a strike's spectrum as a
   non-negative mix of the calibrated note templates (NNLS by multiplicative updates over a fixed
   9-column dictionary; templates rendered through the same window as the observation).
2. **Harmony labels** — chord symbols from the set of notes still ringing, or from a chroma profile
   matched to chord templates. Not started.

Measured on synthesized D Kurd (templates from single-note "calibration"):

| Scenario                                       | Correct |
| ---------------------------------------------- | ------- |
| Single notes (no ghost octave/twelfth partner) | 9/9     |
| Pairs together, equal loudness                 | 36/36   |
| Pairs 20 ms apart, second at half loudness     | 36/36   |
| Pairs together, second at 70% loudness         | 35/36   |
| Pairs with a very quiet second (¼)             | 33/36   |
| Triads                                         | 75/84   |

Every miss is an octave or twelfth stack (D3+D4, A3+A4, D3+A4): the upper note lies on the lower
note's own partials and is found only when it exceeds what the lower note's calibrated profile
predicts. Synthesized partials are ideal and identical per strike, so real-instrument accuracy must be
measured on recordings before this is wired into the analyzer.

### Sympathetic resonance

Striking one field makes others ring (a ding strongly drives its octave field). Averaging over time
does not separate them: a resonance is a steady tone like the struck note. What does:

- **Learned templates** (shipped): calibration records each note's measured spectral peaks, merged
  over its strikes (`spectralPeaks`, `mergePeaks`), so a note's template includes what it sets ringing
  and the decomposition attributes that energy to it. With the partner field only 3 dB below the
  struck note, singles are 9/9 with learned templates (partials-only reports phantom notes) and pairs
  35/36.
- **Fit-based pitched gate** (shipped): in chord mode a strike is pitched when the templates explain
  ≥ 50% of its new energy; a single pitch's harmonicity fails once several notes and their resonance
  share the spectrum (most pairs were misread as taks).
- **Attack window** (tried, removed): decomposing the first ~45 ms against resonance-free templates
  to admit a struck octave/twelfth partner changed no result; the octave pair (D3+D4) remains the limit.

## Music model (general)

Notation reuses `plugin-sequencer`'s ECHO types rather than defining its own:

| Handpan concept                    | Sequencer type                                       |
| ---------------------------------- | ---------------------------------------------------- |
| Song (name, tempo, time signature) | `Score` — plus `key?` (added for this plugin)        |
| Segment                            | `Sequence` on one track, in `Score.sequences` order  |
| Segment overrides                  | `Sequence.timeSignature?` / `Sequence.key?` (added)  |
| Bar                                | derived from the time signature over `length`        |
| Strike / chord                     | `Note`s (MIDI pitch, beats); a chord shares a start  |
| Tak / slap                         | `Note.articulation?` (added); pitch is a placeholder |

All additions are optional, so existing scores are unaffected. Per-bar time-signature changes are
not modelled: a new `Sequence` starts a new meter. The handpan scale (instrument tuning) belongs to the
track's `Instrument` (plugin-sequencer, referenced by `Track.instrumentRef`), distinct from the musical
key. `Instrument` is generic: `family` (e.g. `handpan`), `tuning` (MIDI pitches and root/ding), a
reference pitch, and `calibration` — each note's recorded strikes (frequency, partials, spectral peaks).
Calibration therefore syncs with the space instead of living in one browser; `src/notation/instrument.ts`
maps it to and from the tuner's calibration state, and the `Tuner` binds to it through its
`calibration` / `onCalibrationChange` props (Phase 2's container passes the ECHO object).

`strikesToNotes` (`src/notation/strikes.ts`) is the bridge for record mode: strike times → quantized
beats at the score's tempo, chords → notes sharing a start, taks → percussive notes.

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
