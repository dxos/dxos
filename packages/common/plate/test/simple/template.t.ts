import { z } from '..';
import { interactiveDirectory } from '..';

export default interactiveDirectory({
  include: ['*'],
  exclude: ['exclude', /exclude/],
  inputShape: z.object({
    name: z.string().describe('name the thing').default('name')
  })
});
