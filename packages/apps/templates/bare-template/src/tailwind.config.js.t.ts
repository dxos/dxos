import { text, defineTemplate } from '@dxos/plate';
import config from './config.t';

export default defineTemplate(
  ({ input }) => {
    const { tailwind } = input;
    return !tailwind
      ? null
      : text`
      /** @type {import('tailwindcss').Config} */
      module.exports = {
        content: ["./index.html", "./src/**/*.{js,ts,tsx,jsx}"],
        theme: {
          extend: {},
        },
        plugins: [],
      }
      `;
  },
  { config }
);
