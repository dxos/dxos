import { directory, z } from '@dxos/plate';

export default directory({
  inputShape: z.object({
    name: z.string().describe('package name')
  })
});
