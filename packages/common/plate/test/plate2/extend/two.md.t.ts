import template from './template.t';
import inherited from '../simple/two.md.t';

export default template.text({
  content: async (context) => {
    const { input } = context;
    // const inheritedContent = await inherited({
    //   ...context,
    //   slots: {
    //     prop: 'coming from inherted'
    //   }
    // });
    // const thisFile = inheritedContent.results.find((r) => )
    return `salutations, ${input.name}`;
  }
});
