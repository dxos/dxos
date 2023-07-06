import { text } from '@dxos/plate';
import template from './template.t';

export default template.define.text({
  content: ({ input }) => {
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
});
