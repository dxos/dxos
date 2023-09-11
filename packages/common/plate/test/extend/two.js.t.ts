import template from './template.t';
import inherited from '../simple/two.js.t';
import { plate } from '../../src';
import Callsite from 'callsite';

export default template.define.slots(inherited.slots).script({
  content: async (context) => {
    const { input, slots, outputFile, imports } = context;
    imports.use('prefixed', '.')();
    const inheritedContent = await inherited({
      ...context,
      input: {
        name: `prefixed ${input.name}`,
      },
      slots: {
        prop: (context) => {
          console.log('slot.prop', { context });
          console.log(Callsite()?.map((s) => s.getFileName()));
          return plate`${imports.use('prefixed', '.')} ${slots.prop}`;
        },
      },
    });
    const currentFile = inheritedContent.files.find((file) => file.path == outputFile);
    return currentFile?.content;
  },
});
