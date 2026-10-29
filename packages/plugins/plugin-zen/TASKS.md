# plugin-zen tasks

## plugin-zen.sleep-fade: Timed Dreams fade out instead of stopping

Spec: `packages/plugins/plugin-zen/PLUGIN.mdl`

- [x] F-6.1: Fade over the last 30 s of a timed Dream, or the whole Dream when it is shorter. Replace the
      `FADE_OUT_SECONDS = 10` local in `Mixer` with an exported `SLEEP_FADE_SECONDS = 30` and a pure
      timed-playback step that decides when to start the fade and when to stop; test the step for a 60 s,
      a 15 s and a 30 s Dream, and test that `MixerEngine.fadeOut` ramps the master gain linearly to zero.
- [x] F-6.2: Test that a manual stop during a fade stops at once: `MixerEngine.stop` schedules no ramp and
      closes the context, and the step never asks for a fade after it.
- [x] F-6.3: Test that an untimed Dream (duration 0 or absent) never fades or auto-stops.
