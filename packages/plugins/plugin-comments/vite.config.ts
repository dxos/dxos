//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'CommentsPlugin': 'src/CommentsPlugin.tsx',
    'CommentsPlugin.node': 'src/CommentsPlugin.node.ts',
    'CommentsPlugin.workerd': 'src/CommentsPlugin.workerd.ts',
    'skills': 'src/skills/index.ts',
    'capabilities': 'src/capabilities/index.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'hooks': 'src/hooks/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'translations': 'src/translations.ts',
    'types': 'src/types/index.ts',
  },
  jsx: 'react',
  // `happy-dom` so extension unit tests can construct a real `EditorView` (see
  // `suggestions-overlay.test.ts`), mirroring `ui-editor`'s vite.config.ts.
  test: { node: { environment: 'happy-dom' }, storybook: true },
});
