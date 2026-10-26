# plugin-recorder — tasks

Design: [DESIGN.md](DESIGN.md).

## Phase 1 — presenter notes + voice-over takes

- [x] presenter: `Slide.duration` (desired length) editable with the slide's properties
- [x] presenter: `getSpeakerLines` + tests
- [x] presenter: `notes` setting (off | subtitles | window) + settings surface
- [x] presenter: subtitles overlay while presenting
- [x] presenter: notes window (portal into `window.open`) with timer vs desired length
- [x] presenter: `PresenterSurface.Toolbar` / `Overlay` slots, `PresentationEventHandler` capability
- [x] studio: `audio/*` VariantRenderer
- [x] recorder: scaffold, `Recording` type, settings (mic, video source) + mic test
- [x] recorder: level meter (pure math + component)
- [x] recorder: recorder service, Record toolbar item, overlay, take save (Variant + File)
- [x] recorder: Recordings companion (takes, per-slide length vs desired)
- [ ] stories, tests, PLUGIN.mdl (QA + Changelog) for recorder; presenter/studio PLUGIN.mdl updates
- [ ] verify in storybook; mic paths in Chrome

## Later

- [ ] Buffer take chunks in IndexedDB so a tab crash cannot lose a take
- [ ] Phase 2: ffmpeg planner (trim, stretch, loudnorm) + EDGE container runner + Tauri sidecar runner
- [ ] Phase 3: screen + camera overlay in one take
- [ ] Picture sources: autocue video with gated playback and fitted rates; plugin-canvas animations
