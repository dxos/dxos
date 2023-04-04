import { z, defineConfig } from '../../src';

export default defineConfig({
  inputShape: z.object({
    name: z.string().describe('the name of the thing').default('widget')
  }),
  prepareContext({ input, ...rest }) {
    return {
      input: {
        ...input,
        name: input.name + ' suffix'
      },
      ...rest
    }
  }
});
