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

  Run the app with \`npm\`:
  \`\`\`bash
  npm install
  npm run serve
  \`\`\`

  Build the app to the \`out\` folder:
  \`\`\`bash
  npm run build
  \`\`\`

  Deploy the app to a [DXOS Kube](https://docs.dxos.org/guide/kube):
  \`\`\`bash
  npm run deploy
  \`\`\`

  ${storybook && text`
  Run storybook in this project
  \`\`\`bash
  npm run storybook
  \`\`\`
  `}

  [📚 Using ECHO with React](https://docs.dxos.org/guide/react)
  [📚 DXOS Documentation](https://docs.dxos.org)
  `
})