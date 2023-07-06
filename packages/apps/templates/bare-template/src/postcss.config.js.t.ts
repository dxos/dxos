import { text } from '@dxos/plate';
import template from './template.t';

export default template.define.text({
  content: ({ input: { tailwind, dxosUi } }) => {
    return (
      tailwind &&
      !dxosUi &&
      text`
      module.exports = {
        plugins: {
          'tailwindcss/nesting': {},
          tailwindcss: {},
          autoprefixer: {}
        },
      }
      `
    );
  },
});
