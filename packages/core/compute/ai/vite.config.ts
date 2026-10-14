//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'resolvers': 'src/resolvers/index.ts',
    // Its own entry, apart from the `resolvers` barrel: the adapter itself depends on nothing but
    // `effect`, so a consumer that only needs an OpenAI/Ollama chat-completions language model
    // should not pull in the DXN-keyed resolver machinery the barrel brings with it.
    'chat-completions': 'src/resolvers/ChatCompletionsAdapter.ts',
    'testing': 'src/testing/index.ts',
  },
  test: { node: true },
});
