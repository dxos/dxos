import { plate } from '@dxos/plate';
import template from './template.t';

export default template.define.text({
  content: ({ input: { name } }) => plate`
    # ${name}

    This app was created with a DXOS application template.

    Run the app with \`npm\`:
    \`\`\`bash
    npm install
    npm run dev
    \`\`\`

    > Warning: pnpm is not supported for now, please use npm. (issue locating css in node_modules).

    - [📚 Composer Documentation](https://docs.dxos.org/composer/)
    - [📚 Using ECHO with React](https://docs.dxos.org/guide/react)
    - [📚 DXOS Documentation](https://docs.dxos.org)
  `
});