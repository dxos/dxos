import { plate } from '@dxos/plate';
import template from './template.t';

export default template.define.text({
  content: ({ input: { tailwind, dxosUi } }) => {
    return (
      tailwind &&
      !dxosUi &&
      plate`
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
