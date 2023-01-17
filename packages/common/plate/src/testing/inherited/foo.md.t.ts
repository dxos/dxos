import { defineTemplate, text } from '../..';
import config from './config.t';

export default defineTemplate(
  ({ input }) => {
    const { name, bar } = input;
    return bar
      ? text`
            # foo.md
            bar is true. name is ${name}
            `
      : null;
  },
  { config }
);

