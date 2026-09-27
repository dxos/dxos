//
// Copyright 2026 DXOS.org
//

import { ModuleUrlPlugin } from '../../../tools/storybook-react/.storybook/module-url-plugin.ts';
import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    Client: 'src/Client.ts',
    Worker: 'src/Worker.ts',
    Coordinator: 'src/Coordinator/index.ts',
    WorkerProtocol: 'src/WorkerProtocol.ts',
    RpcTiming: 'src/RpcTiming.ts',
  },
  jsx: 'react',
  test: { node: true, browser: { browsers: ['chromium'], plugins: [ModuleUrlPlugin()] }, storybook: true },
});
