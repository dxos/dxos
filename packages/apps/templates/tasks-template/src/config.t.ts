import { z, defineConfig } from '@dxos/plate';
import inherited from '@dxos/bare-template';

export default defineConfig({
  inherits: '../../bare-template/src',
  inputShape: inherited.inputShape
});
