import { text, defineTemplate } from '@dxos/plate';
import config from './config.t';

export default defineTemplate(
  ({ input }) => {
    const { tailwind, dxosUi } = input;
    return tailwind && !dxosUi
      ? text`
      /** @type {import('tailwindcss').Config} */
      module.exports = {
        content: ["./index.html", "./src/**/*.{js,ts,tsx,jsx}}"],
        theme: {
          extend: {},
        },
        plugins: [],
      }
      `
      : tailwind && dxosUi
      ? text`// file left intentionally blank for tailwind detection`
      : null;
  },
  { config }
);
