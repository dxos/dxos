//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    Client: 'src/Client.ts',
    Worker: 'src/Worker.ts',
    Coordinator: 'src/Coordinator/index.ts',
    WorkerProtocol: 'src/WorkerProtocol.ts',
  },
  jsx: 'react',
  test: { node: true, browser: 'chromium', storybook: true },
});
