import path from 'node:path';
import { interactiveDirectory, z } from '@dxos/plate';

export default interactiveDirectory({
  inputShape: z.object({
    name: z.string().describe('package name'),
  }),
  src: __filename.endsWith('.ts') ? __dirname : path.resolve(__dirname, '../../../../src/templates/package'),
});
