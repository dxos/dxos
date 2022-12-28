import { text, defineTemplate } from '@dxos/plate';
import config from './config.t';

export default defineTemplate(
  ({ input }) => {
    const { tailwind } = input;
    return !tailwind
      ? null
      : text`
<<<<<<< HEAD
  // This file is generated intentionally empty to enable vscode extensions to run in this project. 
  // Tailwind itself is configured within the vite plugin from @dxos/react-components`;
=======
      /** @type {import('tailwindcss').Config} */
      module.exports = {
        content: ["./index.html", "./src/**/*.{js,ts,tsx,jsx}"],
        theme: {
          extend: {},
        },
        plugins: [],
      }
      `;
>>>>>>> b5f795c6a (wip)
  },
  { config }
);
