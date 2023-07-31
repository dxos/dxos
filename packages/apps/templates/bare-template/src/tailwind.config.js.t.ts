import { plate } from '@dxos/plate';
import template from './template.t';

export default template.define.text({
  content: ({ input }) => {
    const { tailwind, dxosUi } = input;
    return tailwind && !dxosUi
      ? plate`
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
      ? plate`// file left intentionally blank for tailwind detection`
      : null;
  },
});
