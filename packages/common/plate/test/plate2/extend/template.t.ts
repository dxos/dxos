import inherited from '../simple/template.t';
import { directory } from '..';

export default directory({
  inputShape: inherited.inputShape,
  inherits: async (context) => {
    const { input } = context;
    return inherited.apply({ ...context, input: { name: `prefixed ${input?.name}` } });
  }
});
