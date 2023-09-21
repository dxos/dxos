import path from 'path';
import { interactiveDirectory } from '@dxos/plate';
import inherits from '@dxos/bare-template';

export default interactiveDirectory({
  src: __filename.endsWith('.ts') ? __dirname : path.resolve(__dirname, '../../src'),
  inherits: (context) => inherits.apply({ ...context, input: { ...context.input, proto: true } }),
  inputShape: inherits.inputShape,
  defaultInput: {
    proto: true,
  },
});
