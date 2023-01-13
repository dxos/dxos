import { defineTemplate, text } from '@dxos/plate';
import config from '../config.t';

export default defineTemplate(
  ({ input }) => {
    const { dxosUi, tailwind } = input;
    return !dxosUi
      ? text`
      ${
        tailwind &&
        !dxosUi &&
        text`
        @tailwind base;
        @tailwind components;
        @tailwind utilities;`}
        `
      : null;
  },
  { config }
);
