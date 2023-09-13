import template from './template.t';
import inherited from '../simple/two.js.t';
import { plate } from '../../src';

export default template.define.slots(inherited.slots!).script({
  content: async (context) => {
    const { input, slots } = context;
    const inheritedContent = await inherited({
      ...context,
      input: {
        name: `prefixed ${input.name}`,
      },
      slots: {
        prop: ({ imports }) => {
          const r = plate`${imports.use('prefixed', '.')} ${slots.prop}`;
          return r;
        },
      },
    });
    const currentFile = inheritedContent.files?.[0];
    return currentFile?.content;
  },
});
