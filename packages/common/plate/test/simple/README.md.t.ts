import { defineTemplate, text } from '../../src';
import { Input } from './config.t';

export default defineTemplate<Input>(
  ({ input }) => {
    const { name } = input;
    return text`name: ${name}`;
  }
);
