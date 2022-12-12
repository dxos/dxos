import { z, defineConfig } from '@dxos/plate';
import inherited from '../bare-template/config.t';

export default defineConfig({
  inherits: '../bare-template',
  inputShape: inherited.inputShape
});
