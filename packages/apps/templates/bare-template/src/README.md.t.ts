import { plate } from '@dxos/plate';
import template from './template.t';

export default template.define.text({
  content: ({ input }) => {
    const { name, pwa, react, dxosUi, storybook } = input;
    return plate`
  # ${name}

  This app was created with a DXOS application template.

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

  ${
    storybook &&
    plate`
  Run storybook in this project
  \`\`\`bash
  npm run storybook
  \`\`\`
  `
  }

  [📚 Using ECHO with React](https://docs.dxos.org/guide/react)
  [📚 DXOS Documentation](https://docs.dxos.org)
  `;
  },
});
