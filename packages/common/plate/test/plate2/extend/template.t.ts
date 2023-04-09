import template from '../simple/template.t';
import { InteractiveDirectoryTemplate } from '../../../src/plate2';

export default new InteractiveDirectoryTemplate({
  input: template.input,
  inherits: (context) => {
    const { input } = context;
    return template.execute({ ...context, input: { name: `prefixed ${input.name}` } });
  }
});
