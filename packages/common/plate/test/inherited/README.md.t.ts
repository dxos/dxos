import { defineTemplate, text } from '../../src';
import readme from '../template/README.md.t';

export default defineTemplate((context) => {
  return readme({
    ...context,
    slots: { content: 'replaced-content-here' }
  });
});
