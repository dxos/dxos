# @dxos/autocue

The on-screen UI of [autocue](../../.agents/skills/autocue/SKILL.md) recordings.

Each component is a plain-DOM core that renders into a shadow root, plus a React wrapper for storybook. The skill's
scripts bundle a core with `scripts/inject.mjs` and evaluate it in the recorded page, where there is no React and no
module resolution. A core may import only other cores and `tokens.ts`.

| Component | Core | Story |
| --- | --- | --- |
| `Frame` — title band, content, caption band | `createFrame` | `tools/autocue/Frame` |

Styles read `--autocue-*` custom properties (`src/tokens.ts`), which a host can override from outside the shadow root.

Design and roadmap: [`.agents/projects/autocue-ui`](../../.agents/projects/autocue-ui/DESIGN.md).
