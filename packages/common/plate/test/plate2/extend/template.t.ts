import template from '../simple/template.t';
import { directory } from '..';

export default directory({
  inputShape: template.inputShape,
  inherits: (context) => {
    const { input } = context;
    return template.execute({ ...context, input: { name: `prefixed ${input.name}` } });
  }
});