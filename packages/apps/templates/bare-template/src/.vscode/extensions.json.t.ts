import { plate } from '@dxos/plate';
import template from '../template.t';

export default template.define.text({
  content: ({ input }) => {
    const { tailwind } = input;
    return (
      tailwind &&
      plate`
      {
        "recommendations": [
          "csstools.postcss",
          "bradlc.vscode-tailwindcss"
        ]
      }
      `
    );
  },
});
