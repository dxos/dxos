//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    bridge: 'src/bridge/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    Protocol: 'src/protocol/Protocol.ts',
    render: 'src/render/index.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
    StreamDeckCapabilities: 'src/types/StreamDeckCapabilities.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
