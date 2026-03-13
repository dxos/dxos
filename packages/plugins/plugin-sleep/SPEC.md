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
- [x] `soundtrack` enum: `fireplace`, `ocean_surf`, `rain`, `stream` (bundled `.m4a` files).
- [ ] `duration` defaults to 30 minutes, selectable range 5-120 minutes.
- [x] Register `Dream` type with schema module and metadata.
- [x] Create `SleepArticle` container that renders a form to edit `Dream` objects via `react-ui-form`.
- [x] Register article surface for the `Dream` type.
- [x] Add translations for type labels and plugin name.

## Phase 2 (Sequencer & Dynamic Sounds)

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
