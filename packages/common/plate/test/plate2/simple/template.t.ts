import { z } from '..';
import { directory } from '..';

export default directory({
  include: ['*'],
  exclude: ['exclude', /exclude/],
  inputShape: z.object({
    name: z.string().describe('name the thing').default('name')
  })
});
