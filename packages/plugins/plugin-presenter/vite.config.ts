//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    deck: 'src/deck/index.ts',
    markdown: 'src/markdown/index.ts',
    operations: 'src/operations/index.ts',
    skills: 'src/skills/index.ts',
    translations: 'src/translations.ts',
    testing: 'src/testing/index.ts',
    Presentation: 'src/types/Presentation.ts',
    PresenterCapabilities: 'src/types/PresenterCapabilities.ts',
    PresenterEvents: 'src/types/PresenterEvents.ts',
    PresenterOperation: 'src/types/PresenterOperation.ts',
    PresenterSettings: 'src/types/PresenterSettings.ts',
    PresenterSurface: 'src/types/PresenterSurface.ts',
    SlideEditorViewState: 'src/types/SlideEditorViewState.ts',
    SlideTheme: 'src/types/SlideTheme.ts',
    SlideViewState: 'src/types/SlideViewState.ts',
    hooks: 'src/hooks/index.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true, workerd: true },
});
