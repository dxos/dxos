import { text } from '@dxos/plate';
import template from '../template.t';

export default template.define.text({
  content: ({ input }) => {
    const { tailwind } = input;
    return (
      tailwind &&
      text`
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
