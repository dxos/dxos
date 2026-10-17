# Ident

Sovereign Intelligence video ads, built with [Remotion](https://www.remotion.dev) (React), in `src/ident/`.
autocue bookends recordings with its opening title and end card (`trim-static.mjs --ident`).
Every spot shares one system: black field, a provocation built word by word, a cut to black,
then the DXOS end card. Only the words change.

## Setup (once)

1. Install [proto](https://moonrepo.dev/proto); `proto use` installs node, pnpm and moon from `.prototools`.
2. `pnpm install` (from the repo root)
3. Copy `SharpSansDispNo1-Medium.ttf` into `public/fonts/` (licensed, not committed).
4. Optional: `moon run autocue:sounds` regenerates the placeholder sounds in `public/audio/` (needs Python + numpy).

## Day to day

| Task                                                      | Command                                                                                      |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Preview and scrub every spot                              | `moon run autocue:studio`                                                                    |
| Render one spot                                           | `moon run autocue:render -- --id P03 --length 10s --format 16x9`                             |
| Render one provocation, all lengths and formats           | `moon run autocue:render -- --id P03`                                                        |
| Render the first run (P01, P02, P03, P05, P07, P11, P12)  | `moon run autocue:render-first-run`                                                          |
| Render the opening title only, all formats                | `moon run autocue:render -- --id OPEN`                                                       |
| Render the DXOS trail only, all formats                   | `moon run autocue:render -- --id TRAIL`                                                      |
| Render the end card only, all formats                     | `moon run autocue:render -- --id END`                                                        |
| Render the idents only (OPEN, COMPOSER, END), all formats | `moon run autocue:render -- --id OPEN,COMPOSER,END`                                          |
| Render everything except the TRAIL stub                   | `moon run autocue:render-all`                                                                |
| Render everything                                         | `moon run autocue:render`                                                                    |
| Bump the file version                                     | add `--version 2`                                                                            |
| Light theme (off-black on off-white)                      | add `--theme light` (file suffix `_light`)                                                   |
| Logo colour, a Tailwind hue                               | add `--logo-color sky` (suffix `_sky`; `-400` in dark, `-600` in light); the rule follows it |
| Preview every card at any size, theme and colour          | storybook `tools/autocue/Ident`                                                              |

Output goes to `out/<ID>/DXOS_SI_<ID>_<length>_<ratio>_v<NN>.mp4`, e.g.
`out/P03/DXOS_SI_P03_10s_9x16_v01.mp4`. Drop those into Final Cut.

Formats: `16x9` (1920x1080), `16x10` (2560x1600, MacBook displays), `9x16` (1080x1920), `1x1` (1080x1080), `4x5` (1080x1350).
Lengths: `10s`, `30s`.

## Where to change things

| Change                                                          | File                                                                            |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Add or edit a provocation, its resolve line or 30s "turn" lines | `src/ident/provocations.ts`                                                     |
| Colors, tagline, CTA text, Discord URL, logo, timing            | `src/ident/brand.ts`                                                            |
| How the type builds and how the end card animates               | `src/ident/components.tsx`                                                      |
| The order of beats in 10s and 30s spots                         | `src/ident/Spots.tsx`                                                           |
| Sounds                                                          | replace `public/audio/pulse.wav` and `public/audio/sonic-logo.wav` (keep names) |

## Using the real logo

Export the mark from Affinity as SVG to `public/brand/dxos-mark.svg`, then in `src/ident/brand.ts`
set `markSrc: 'brand/dxos-mark.svg'`.

## Open items

- Real Discord invite URL (currently `discord.gg/dxos`, a placeholder).
- DXOS logo file (currently the word DXOS set in Sharp Sans).
- Real sonic logo (current sounds are generated placeholders).
- Heavier Sharp Sans weights, if headlines should be bolder than Medium.
