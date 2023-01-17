import { text, defineTemplate } from '@dxos/plate';
import config from './config.t';

export default defineTemplate(
  ({ input }) => {
    const { tailwind, dxosUi } = input;
    return tailwind && !dxosUi
      ? text`
      module.exports = {
        plugins: {
          'tailwindcss/nesting': {},
          tailwindcss: {},
          autoprefixer: {}
        },
      }
      `
      : null;
  },
  { config }
);
