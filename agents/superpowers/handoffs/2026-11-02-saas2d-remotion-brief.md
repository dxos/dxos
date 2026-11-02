# Brief: recreate the Saas2D animation in Remotion from this branch

Paste this to the agent building the sibling animation. Everything it names is on branch `claude/zen-bhabha-478331`
of `dxos/dxos` (commit `3d6111746db` or later), under `tools/autocue/`. Read the files before writing anything; the
design system is code, not a style guide, and the values are the spec.

## What the animation is

A two-minute 2D story, 1920×1080 at 60 fps (30 fps in draft), rendered with Remotion from
`src/components/Saas2D/`. One continuous model of discs, rings, links and flows is laid out 26 times (the scenes);
a cut between scenes is a morph of that model, never a swap of pictures. The story: SaaS centralized a company's
data in vendors' silos; agents need the joins across those silos; the frontier labs offer to hold everything, a
deeper dependence; the alternative is ECHO, a company-owned hypergraph of spaces and objects on Cloudflare, with
Composer on top. It is voiced by Watson (ElevenLabs) and ends on the DXOS lockup with “Your team. Your apps. Your
data.” and “Powered by Cloudflare”.

- Storyboard and model rules: `src/components/Saas2D/STORYBOARD.md` (the element hierarchy, what morphs, what a cut
  may do, scene notes).
- Script as voiced, scene by scene with on-screen descriptions: `showcase/echo3d/SPEAKING-TRACK-SAAS2D-inversion.md`;
  the full narrative and three prose cuts: `showcase/echo3d/NARRATIVE-SAAS2D.md`; brief, fact sheet (what may and
  may not be claimed about ECHO/Composer) and critiques: `agents/superpowers/specs/saas2d-voiceover.md`.

## The neumorphic design system (“neu-dark”)

`src/components/Saas2D/tokens.ts` is a port of the DXOS neumorphic tokens (dxos/studio `assets/tokens.mjs`); keep
the math, do not retune values.

- Palette `PALETTE`: neutrals black `#020202`, darker `#1b1b1e`, graphite `#1d1f20`, mid `#42424b`, dark `#999999`,
  mist `#e6e9eb`, lightest `#eeeeee`, white; accents blue `#2d6fff`, cyan `#06c5fd`, turquoise `#1fbfd5`, green
  `#1fd58a`, purple `#d83eff`, pink `#fb44b2`, gold `#f2c14e`.
- Role colors `ROLES`: team = blue, data = gold, lab = purple, agent = green. Role color belongs to what a body holds
  (nodes, data), never to the body itself.
- Theme `NEU`: light angle 225°, radius 16, glow 35, ease `cubic-bezier(0.22, 1, 0.36, 1)`, 220 ms; dark theme hue
  220, sat 10 %, light 15 %, shadow distance 7, blur ×2, highlight 9 %, lowlight 70 %, accent cyan. `neuTokens('dark')`
  derives `bg`, foreground/muted text, accent, and `shadow('raised' | 'inset', dist)` from these; `theme.tsx` exports
  it as `neu`.
- Fonts `FONTS`: DM Sans (headings, body; 400/500/700 in `public/fonts/`), DM Mono (labels, code, the chapter chip),
  Sharp Sans Display No.1 Medium for the logotype only (licensed; not in the repo, falls back to DM Sans when absent —
  `fonts.ts` loads them with `delayRender`).
- Surface: `Background` is a radial gradient `hsl(220 11% 16%)` at 50 % 42 % → `neu.bg` at 55 % → `hsl(220 11% 11%)`;
  `Grain` is a seeded static `feTurbulence` field at 2.5 % opacity drawn last, so nothing crawls; the final encode adds
  a fine dither again (`noise=alls=2`).
- Shapes (`theme.tsx`): a **body** is one raised band around one inset well, both shades of the field (well radius
  0.84 of the body’s; a company or lab band is broader, well 0.72 / 0.62); SVG filters `nd-raised` (highlight rim
  `hsl(220 12% 34% / 0.22)` top-left, lowlight `hsl(220 30% 2% / 0.78)` bottom-right), `nd-chip`, `nd-glow`,
  `nd-title`, per-role radial gradients `nd-node-<role>` and accent glow `nd-glow-accent`. A **node** is a lit disc in
  its role’s gradient with a glow; a **ring** is a dotted orbit or a solid app ring in the app’s color; a **link** is a
  thin line, accent when `hot`; a **flow** is dots travelling along a link; a **chip** is a raised pill with an accent
  dot (`align: 'start' | 'end'` hangs it off a point with the dot on the near edge); a **card** is a Composer-style
  object card in screen pixels with a thread of messages that land at their `at`; **label**, **title**, **fill**,
  **logo** (the DXOS lockup, or `brand/cloudflare.png`).

## The engine (`engine.ts`), which is what makes the morphs work

- A scene returns a `Frame`: a `Camera { x, y, zoom }` and a list of `Prim`s. Primitive kinds and their fields are the
  exported types; `LAYERS` is the draw order (body, ring, link, flow, node, chip, fill, label, title, logo).
- Every prim has a stable `kind:id`; the engine blends prims with the same id across a cut (`mix`), numeric fields
  interpolate, everything else comes from the scene being entered. `parent` says where a prim lives: an entering prim
  grows out of its parent’s previous place, a leaving one folds into its parent’s next place; `from` names what a prim
  becomes (one vendor becoming many apps). Links and flows name the elements they join (`a`, `b`, as `kind:id`) and
  `bind` puts their ends on those elements every frame, clipped to the rims, so a link never points at empty space;
  `screen2` lets a link end at a screen-pixel point (a card’s edge).
- Easing: `ease` (the design system’s bezier, for short cuts), `easeInOut` (scene-long motion), `easeMorph` (long
  morphs); `ramp(t, start, seconds, curve)`, `lerp`, `clamp`. `TRANSITION` is 1.25 s unless a slide sets its own.
- `place(slides, holds)` lays the slides on the timeline from a holds file; `frameAt(seconds)` returns the blended
  frame. `Saas2D.tsx` renders it: `Defs`, `Background`, the SVG prims, the cards as DOM, `Captions`, `Grain`, and in
  draft/clock mode a burnt-in scene id and time.

## Scenes (ids, in order)

blank, beginning, silo, silo-comms, scale, competitors, spread, spread-comms, frontier, frontier-comms, orbit, absorb,
rivals, merge-1, final-frontier, engulf, dont-panic, spread-again, echo-hub, echo-spaces, objects, object-created,
echo-spaces-again, echo-hub-again, saas-merge, company-fills. `slides.ts` holds all of them plus the layout helpers
(company ring, apps around, lab bands, the three ECHO spaces with object graphs and bridges, the conversations over the
hypergraph, the object cards). `captions.tsx` draws the chapter chip top-left (eight chapters) and a subtitle line at
the bottom whose `[bracketed]` phrase sits on the accent and settles up 10 px as it appears.

## Voice and timing pipeline (`showcase/echo3d/voice/`)

- `tts.py <track.md> <dir> <voice> [speed]` makes one ElevenLabs take per scene (needs `DX_ELEVENLABS_API_KEY`; Watson
  is `jRVXPhztJiPV60oQlVMX` at 1.08). It spells `DXOS` as `D-X-O-S`, `SaaS` as `sass`, and turns a `[PAUSE]` direction
  into a `<break time="0.8s" />`.
- `fit_saas2d.py <takes> <holds.json>` sets each scene’s hold to its take + 0.3 s breath, never below the scene’s
  motion floor (`SHORTEST`); `holds-saas2d-inversion.json` is the current timeline (2:06.6).
- `mix.py` lays the cleaned takes on the timeline (`audio.py` trims and levels them to −18 LUFS, the mix to −16);
  anchors pin a take to a cue in the picture, and a slide may carry extra takes `<slide>.1`, `.2`… each with its own
  anchor (the close is four: “This is DXOS” as the logo lands, then one word per caption).
- `subtitles-saas2d-inversion.json` replaces the built-in subtitles per scene.
- Render: `node scripts/render-saas2d.mjs --holds <holds> [--captions] [--subtitles <json>] [--draft] --out <mp4>`;
  `--draft` is half size, 30 fps, flat shapes, scene and time burnt in (about 45 s); a full render is 2× scale,
  crf 10, then scaled to 1080p with grain (about 5 min). Mux with ffmpeg; see the commands in
  `agents/superpowers/specs/saas2d-voiceover.md`.

## Assets on the branch

- `public/brand/dxos-horizontal-dark.svg`, `dxos-horizontal-white.svg`, `cloudflare.png` (512×173).
- `public/fonts/DMSans-{Regular,Medium,Bold}.ttf`, `DMMono-{Regular,Medium}.ttf` (OFL). Sharp Sans is not committed.
- `public/audio/` (ident sounds); the voice takes are not committed (`temp/voice/`), regenerate them with `tts.py`.
- Renders of the current cut: `~/Desktop/Demos/Composer/saas2d-inversion-voiced{,-720p}.mp4` and the `-captions-`
  pair; the half-size draft is `saas2d-inversion-draft.mp4`.

## Rules to keep

- Everything said or shown must hold to the fact sheet in `saas2d-voiceover.md` (no “semantic”, “vector”, “E2EE”,
  “self-hosted EDGE” claims beyond what it allows; EDGE runs on Cloudflare Workers and Durable Objects).
- A cut is a morph unless the storyboard marks it a curtain; nothing swaps pictures.
- Relative imports carry their extension (`./engine.ts`); copyright header `Copyright 2026 DXOS.org`; comments say
  why in one clause; `pnpm format` (oxfmt) before committing; do not edit `main`.
