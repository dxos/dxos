import { z, defineConfig } from '../../index';
import inherits from '../template/config.t';

export default defineConfig({
  inherits,
  inputShape: z.object({
    bar: z.boolean().describe('bar prompt').default(true)
  }).and(inherits.inputShape!)
});
