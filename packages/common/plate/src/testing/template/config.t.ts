import { z } from 'zod';
import { Config } from '../../config';

const inputShape = z.object({
  name: z.string().default('mypackage').describe('the name of your package')
});

const config: Config = {
  inputShape
};

export type Input = z.infer<typeof inputShape>;

export default config;