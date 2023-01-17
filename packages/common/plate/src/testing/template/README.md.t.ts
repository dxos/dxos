import { defineTemplate, text } from '../../index';
import config from './config.t';

export default defineTemplate(
  ({ input }) => {
    return text`
    // # Package 
    // ${JSON.stringify(input, null, 2)}
    `;
  },
  { config }
);
