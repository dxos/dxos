import { defineTemplate, renderSlots, text, Imports } from '../../src';
import config from './config.t';

export default defineTemplate(
  ({ input, slots, ...rest }) => {
    const imports = new Imports();
    const render = renderSlots(slots)({ input, imports, ...rest })
    return text`
    // # Package
    ${JSON.stringify(input, null, 2)}
    // slot content
    ${render.content?.()}
    `;
  },
  { config, slots: { content: 'content-to-be-replaced' } }
);
