import { plate } from '@dxos/plate';
import template from '../template.t';

export default template.define.script({
  content: ({ input: { defaultPlugins } }) => defaultPlugins && plate/* javascript */`
    import '@dxosTheme';
    import { runShell } from '@dxos/shell/react';
    import { createConfig } from './config';

    // eslint-disable-next-line no-console
    createConfig().then(runShell).catch(console.error);
  `
})