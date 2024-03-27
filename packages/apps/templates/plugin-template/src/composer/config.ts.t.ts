import { plate } from '@dxos/plate';
import template from '../template.t';

export default template.define.script({
  content: ({ input: { defaultPlugins } }) => defaultPlugins && plate/* javascript */ `
    import { Config, Defaults, Envs, Local, Storage } from '@dxos/config';
    export const createConfig = async () => {
      return new Config(await Storage(), Envs(), Local(), Defaults());
    };
  `,
});
