# Boot loader swarm animation — design

Status: approved in brainstorming (2026-08-10). Interactive mockups explored with the visual
companion; final reference mockup: `.superpowers/brainstorm/*/content/swarm-fullscreen.html`
(untracked scratch — behaviors and constants are captured normatively here).

## Concept

Replace the boot loader's progress ring with a **swarm constellation** built around the Composer
brand mark. Dots representing loading modules start on a concentric circle outside the mark, move
per one of four behaviors, and dock anticlockwise onto an orbit ring around the mark as boot
progresses. One behavior is picked at random each boot. The screen stays greyscale until the app is
ready (docked dots merely brighten); the brand color then sweeps in. Dismissal flings the dots
radially outward. The bottom-anchored scrolling status log is unchanged.

## Visual rules (normative)

Geometry is expressed in the loader SVG's viewBox units; the reference frame below uses the mockup's
`0 0 400 300` box with center `(200, 150)` — the implementation maps the same proportions onto the
existing disc viewBox.

- **Mark**: the Composer icon SVG (`packages/ui/brand/assets/icons/composer-icon.svg`), nested
  inside the loader SVG so it scales with it; ~84 units on the 300-unit box (28%).
- **Orbit ring**: radius 76 (mark stays fully inside; clear margin).
- **Outer start circle**: radius 136. Every dot's rest/entry position sits on it, offset by a
  +0.55 rad angular lead so inbound flights read as an anticlockwise spiral.
- **Anticlockwise everywhere**: dock order runs anticlockwise from 12 o'clock (matches the old
  ring's sweep); orbital circulation and ring rotation are anticlockwise.
- **No-go zone**: radius 60 around center. No dot may enter; positions that would fall inside are
  projected radially back to the rim.
- **Docking**: dot `i` (of `N`) begins docking as soon as `progress × N > i` — immediately on its
  turn — with an eased (~450 ms cubic-out) flight to its slot. Undocking never happens (progress
  never regresses; the store already guarantees this).
- **Docked dots do not move.** Sole exception: variant B, where the docked ring rotates
  anticlockwise as a single rigid structure (0.00015 rad/ms) and dots dock onto the moving slots.
- **Colour**: dots carry a grey-blue navy tint during boot — `rgb(56,64,72)` loose, brightening
  toward `rgb(118,138,158)` as they dock; opacity 0.55 → 1.0. On ready (or pointer-over, as a preview) a
  global factor eases (~500 ms) every docked dot and the mark to full colour. Dot/link brand colour
  is the mark's outer ring: `rgb(5,40,61)`. The mark renders greyscale via CSS filter until then.
  No percentage indicator: the docked fraction is the progress display.
- **Outro (dismissal)**: on `ready()`, the colour sweep (~500 ms) and the outro (~600 ms) run
  concurrently, not sequentially — dots accelerate radially outward (positions scale ×3.2 from
  center over ~600 ms, smoothstep), shrinking to ~15% radius and fading to transparent; links
  (variant D) fade out first. Both run inside the existing `dismissing` fade window, unchanged at
  500 ms — no timing changes to `mountLoader`. Because the 600 ms outro outlasts that window, its
  tail may not paint before the loader is removed (accepted).

## The four behaviors

Shared engine, one position function each. Per-variant dot count/size (viewBox units):

| Variant            | Waiting behavior                                                                                                                                                                                                                                                                                                      | N   | size |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ---- |
| A — Firefly wander | Undirected sinusoidal drift (amplitude 55, damped by settle factor) around the midpoint between start and slot.                                                                                                                                                                                                       | 20  | 2.8  |
| B — Orbital        | Anticlockwise circulation at a personal radius (uniform in [74, 128]), slight radial wobble; docked ring keeps rotating rigidly.                                                                                                                                                                                      | 32  | 2.0  |
| C — Comet trails   | Orbital motion plus 4 fading afterimage ghosts sampled every ~45 ms; a dot's tail extinguishes when it docks.                                                                                                                                                                                                         | 48  | 1.6  |
| D — Linked         | Firefly wander; transient links (opacity ∝ closeness, max ~40 at once) flash between unsettled dots within range 46; adjacent docked dots weld permanent links, closing the ring as a chain.                                                                                                                          | 64  | 1.3  |
| E — Halo           | Tiny dots fade in on three tight concentric rings (radii 66/78/90, slot index mod 3) with alternating directions (anticlockwise/clockwise/anticlockwise), each dot at its own fast rate (base 0.0008 rad/ms + per-dot variation); close cross-ring passes (≤18) randomly link (p=0.5, held ~0.8 s) — no wander phase. | 24  | 0.9  |
| F — Arc            | The ORIGINAL pre-swarm ring, restored verbatim (`ClassicRing.tsx`): own 384px disc, viewBox-100 arc, conic fade mask, accent palette, 300px mark with host-driven reveal. No dots.                                                                                                                                    | —   | —    |

Random pick: uniform over all variants at mount (`Math.random()`), no persistence, no
"different-from-last-boot" memory. Storybook can force a variant via prop.

## Architecture

Same Solid pipeline as today — the change is internal to the loader app:

- `packages/sdk/app-framework/src/vite-plugin/boot-loader/loader-app/`
  - **`swarm.ts` (new)** — pure, DOM-free: constants above, per-variant position functions,
    settle/no-go/colour-mix math. Unit-testable like `store.ts`. Tunables are a `SwarmConfig`
    options bag (variant, dot count, dot size, ring/outer/no-go radii, settle duration, ring
    rotation speed, outro scale/duration); each variant supplies defaults, callers may override.
  - **`Loader.tsx`** — replaces the arc/`marker` internals: renders `<circle>` (and `<line>` for D)
    elements once via refs, mutates `cx/cy/r/fill/opacity` inside the existing rAF loop. The eased
    `shown` progress (per-frame lerp toward `store.progress()`) is kept and feeds `lit = shown/100 × N`.
    The mark moves inside the SVG (nested `<svg>`) so it scales with the disc.
  - **`boot-loader.css`** — ring rules replaced by swarm rules (mark grayscale filter + transition);
    backdrop, status log, and dismissal opacity transition unchanged.
  - **`store.ts`, `bridge.ts`, `mount.tsx`, `loader.ts` (plugin)** — untouched. The creep still
    produces continuously increasing progress, which now reads as dots trickling onto the ring
    during silences.
- **Payload**: ~3–4 KB minified added to the inlined bundle; no new dependencies.

## States and edge cases

- **`prefers-reduced-motion: reduce`**: no flights, wander, rotation, or explosion — dots render on
  their slots and fade in anticlockwise with progress; outro is the plain backdrop fade.
- **Light scheme**: same geometry; greys follow the existing light/dark CSS pattern; the navy
  colorize works on both surfaces.
- **Hover**: pointer-over the loader previews the colourized state (eases in/out); purely cosmetic.
- **Perf bound**: ≤64 circles + ≤104 lines mutated per frame, no per-frame allocation (ghost/link
  pools are pre-created).

## Testing

- **Unit (vitest)**: `swarm.test.ts` next to `store.test.ts` — slot positions/ordering
  (anticlockwise from 12 o'clock), settle monotonicity ("docked never moves" for A/C/D; rigid
  rotation invariant for B — pairwise distances constant), no-go projection, lit-count mapping,
  outro scaling.
- **Storybook**: a single story (DefaultStory + args, no per-story renderers) whose controls cover
  the variant (A–D/random) and the `SwarmConfig` tunables — dot count, dot size, rotation speed,
  radii, settle/outro timing — plus the scripted-boot driver; same component as production.
- **Playwright**: `startup.spec.ts` asserts on status text/dismissal, not ring internals — verify
  selectors before landing.

## Out of scope

Status-log restyling, configurable dot counts, exposing variant choice in settings, sound, changes
to dismissal timing or the `window.__bootLoader` bridge API.
