import { z, defineConfig } from '@dxos/plate';
import inherits from '@dxos/bare-template';

export default defineConfig({
  inherits,
  inputShape: inherits.inputShape
});
