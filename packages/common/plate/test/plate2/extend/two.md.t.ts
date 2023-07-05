import template from './template.t';
import inherited from '../simple/two.md.t';

export default template.define.slots(inherited.slots).text({
  content: async (context) => {
    const { input, slots, outputFile } = context;
    const inheritedContent = await inherited({
      ...context,
      input: {
        name: `prefixed ${input.name}`
      },
      slots: {
        prop: `prefixed ${slots.prop}`
      }
    });
    const currentFile = inheritedContent.files.find((file) => file.path == outputFile);
    return currentFile?.content;
  }
});
