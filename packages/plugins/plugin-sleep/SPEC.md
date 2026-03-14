# Sleep Plugin

- A sleep aid plugin inspired by Pzizz.
- Configure Dream objects that control a sound sequencer to help users fall asleep.

## Data Model

- `Dream` is the primary ECHO type with properties: `name`, `duration`, `soundtrack`.
- `soundtrack` is a string enum selecting from bundled sound files.
- `duration` is the playback duration in minutes.

## Phase 1 (Shell)

- [x] Create plugin scaffold following standard DXOS plugin patterns.
- [x] Define `Dream` ECHO schema type with `name`, `duration`, `soundtrack` fields.
- [x] `soundtrack` enum: `fireplace`, `ocean`, `rain`, `stream` (bundled `.m4a` files).
- [x] Register `Dream` type with schema module and metadata.
- [x] Create `SleepArticle` container that renders a form to edit `Dream` objects via `react-ui-form`.
- [x] Register article surface for the `Dream` type.
- [x] Add translations for type labels and plugin name.

## Phase 2

- [ ] Sequencer component and data structure
  - [ ] initial sequence structure has a single source property (m4a file or generator structure)
  - [ ] basic form
  - [ ] storybook
- [ ] Mixer component and datastructure
  - [ ] toolbar to add layers
  - [ ] display layers using react-ui-list; button to delete
  - [ ] manages an ordered collection of layers (sequences)
  - [ ] play/stop button
  - [ ] storybook

## Phase 3 (Sequencer & Dynamic Sounds)

- [ ] Build `Sequencer` class that schedules and crossfades sampled sounds over a configurable timeline.
- [ ] Replace bundled soundtrack enum with dynamic file storage via the WNFS plugin (drag-and-drop upload).
- [ ] Add playback transport controls (play, pause, stop, seek) to the `SleepArticle`.
- [ ] Implement volume envelope curves (fade-in at start, fade-out at end) configurable per Dream.
- [ ] Support layering multiple soundtracks simultaneously (e.g., rain + stream).
- [ ] Add a visual timeline editor showing sound segments and crossfade regions.
- [ ] Generate procedural binaural beats at configurable frequencies mixed into the soundtrack.
- [ ] Implement sleep timer with gradual volume reduction before auto-stop.
- [ ] Add dream presets (e.g., "Deep Sleep", "Power Nap", "Wind Down") as template Dream configurations.
- [ ] Track sleep session history with start time, duration, and Dream used.
- [ ] Voice chat (conversation).

## Generator Notes

1. Mixer
2. Sequencer
3. Timer
4. Sample library
5. Generators
6. Conversational system (note, ideas, meditation)
7. Avatar (introductions)

- Gongs (w /reverb; dischordent)
- Bowls
- Chimes (w /reverb)
- Handpans
- Binaural beats (shifting frequencies; descending) [esp. start 26:50]
- Birdsong
- Surf/fireplace/rain/thunder/wind
- Strings/pads
- Pan flutes
- Choir
- Meditation voice

Why these instruments (gongs, bowls, chimes) are used:
• Broad harmonic spectra
• long decay envelopes
• inharmonic overtones

1. Auditory neuroscience / psychoacoustics
2. Binaural beat and brainwave entrainment research
3. Music therapy and sound meditation
4. Soundscape design for sleep
5. Computational music / generative ambient sound

layer 1: low-frequency drone
layer 2: binaural beat carrier
layer 3: sparse percussive events (gongs/chimes)
layer 4: long convolution reverb
layer 5: random modulation

sleep progression engine
↓
frequency envelope (alpha → theta → delta)
↓
binaural beat generator
↓
ambient layers

Light device
