import { text, defineTemplate } from "@dxos/plate";
import config from "./config.t";

export default defineTemplate<typeof config>(({ input }) => {
  const { name, pwa, react, dxosUi, storybook } = input;
  return text`
  # ${name}

  This app was created with the DXOS \`bare\` application template.
  ${pwa && `- [x] Progressive Web App support`}
  ${react && `- [x] React`}
  ${dxosUi && `- [x] DXOS UI System`}
  ${storybook && `- [x] Storybook`}

  Run the app with \`pnpm\`:
  \`\`\`bash
  pnpm install
  pnpm serve
  \`\`\`

  Build the app to the \`out\` folder:
  \`\`\`bash
  pnpm build
  \`\`\`

  Deploy the app to a [DXOS Kube](https://docs.dxos.org/guide/kube/quick-start):
  \`\`\`bash
  pnpm deploy
  \`\`\`

  ${storybook && text`
  Run storybook in this project
  \`\`\`bash
  pnpm storybook
  \`\`\`
  `}

  [📚 DXOS Documentation](https://docs.dxos.org)
  `
})