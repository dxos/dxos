import path from 'path';
import { z } from '..';
import { InteractiveDirectoryTemplate } from '../../../src/plate2';

export default new InteractiveDirectoryTemplate({
  include: ['*'],
  exclude: ['exclude', /exclude/],
  input: z.object({
    name: z.string().describe('name the thing').default('name')
  })
});
