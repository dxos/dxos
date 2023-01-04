import { text, defineTemplate } from '@dxos/plate';
import config from './config.t';

export default defineTemplate(
  ({ input }) => {
    const { tailwind } = input;
    return !tailwind
      ? null
      : text`
      module.exports = {
        plugins: {
          'tailwindcss/nesting': {},
          tailwindcss: {},
          autoprefixer: {}
        },
      }
      `;
  },
  { config }
);