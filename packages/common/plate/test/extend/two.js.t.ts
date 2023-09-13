import template from './template.t';
import inherited from '../simple/two.js.t';
import { plate } from '../../src';
import Callsite from 'callsite';

export default template.define.slots(inherited.slots).script({
  content: async (context) => {
    const { input, slots, imports } = context;
    imports.use('prefixed', '.')();
    const inheritedContent = await inherited({
      ...context,
      input: {
        name: `prefixed ${input.name}`,
      },
      slots: {
        prop: () => {
          const r = plate`${imports.use('prefixed', '.')} ${slots.prop}`;
          console.log('inherited prop', r);
          return r;
        },
      },
    });
    const currentFile = inheritedContent.files?.[0];
    return currentFile?.content;
  },
});
