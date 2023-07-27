import path from 'path';
import { directory } from '@dxos/plate';
import inherits from '@dxos/bare-template';

export default directory({
  src: __filename.endsWith('.ts') ? __dirname : path.resolve(__dirname, '../../src'),
  inherits,
  inputShape: inherits.inputShape
});
