//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    testing: 'src/testing/index.ts',
    Agent: 'src/types/Agent.ts',
    Chat: 'src/types/Chat.ts',
    McpServer: 'src/types/McpServer.ts',
    Memory: 'src/types/Memory.ts',
    AgentOperation: 'src/operations/definitions.ts',
  },
  jsx: 'react',
  test: { node: true },
});
