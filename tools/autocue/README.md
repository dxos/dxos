# @dxos/autocue

Everything an [autocue](../../.agents/skills/autocue/SKILL.md) recording shows besides the app: the on-screen UI
(`src/components/`) and the DXOS ident cards it is cut between (`src/ident/`, Remotion; see [IDENT.md](IDENT.md)).

Each component is a plain-DOM core that renders into a shadow root, plus a React wrapper for storybook. The skill's
scripts bundle a core with `scripts/inject.mjs` and evaluate it in the recorded page, where there is no React and no
module resolution. A core may import only other cores and `tokens.ts`.

| Component | Core | Story |
| --- | --- | --- |
| `Frame` — title band, content, caption band | `createFrame` | `tools/autocue/Frame` |

Styles read `--autocue-*` custom properties (`src/tokens.ts`), which a host can override from outside the shadow root.

The ident renders with `moon run autocue:render` (clips in `out/`) and previews with `moon run autocue:studio`;
`trim-static.mjs --ident` renders the opening and end cards on first use, at the recording's aspect ratio.

Design and roadmap: [`.agents/projects/autocue-ui`](../../.agents/projects/autocue-ui/DESIGN.md).
