import { defineTemplate, text } from '../../src';
import config from './config.t';

export default defineTemplate(
  ({ input }) => {
    const { name } = input;
    return text`name: ${name}`;
  },
  { config }
);
