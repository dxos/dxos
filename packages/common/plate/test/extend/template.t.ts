import inherited from '../simple/template.t';
import { interactiveDirectory } from '..';

export default interactiveDirectory({
  inputShape: inherited.inputShape,
  inherits: async (context) => {
    const { input } = context;
    return inherited.apply({ ...context, input: { name: `prefixed ${input?.name}` } });
  }
});
