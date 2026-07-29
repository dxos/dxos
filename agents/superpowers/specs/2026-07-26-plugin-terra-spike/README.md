# plugin-terra spike — reference code

Throwaway Babylon + vite spike that validated the
[design](../2026-07-26-plugin-terra-design.md). Preserved here for the
implementation to port from; **not** wired into the build.

- `planet.ts` — engine-agnostic, deterministic planet generation (cubed-sphere,
  seeded fBm, biomes, depth-shaded ocean, `landGain`/`continentPower`
  displacement, scatter placement). Ports to `plugin-terra/src/engine/`.
- `main.ts` — Babylon scene (`ArcRotateCamera` with unclamped beta + shift-pan,
  two hemispheric lights, matte materials, **reversed triangle winding**, thin-
  instance scatter, live resolution control). Ports to
  `plugin-terra/src/engine/scene-manager.ts` + the article container.

Load-bearing details are summarised under "Spike findings (validated)" in the
design doc — read those before porting.
