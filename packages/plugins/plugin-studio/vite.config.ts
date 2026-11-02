//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'ns/Templates': 'src/Templates.ts',
    'index': 'src/index.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'StudioHooks': 'src/hooks/StudioHooks.ts',
    'operations': 'src/operations/index.ts',
    'surfaces': 'src/surfaces.ts',
    'translations': 'src/translations.ts',
    'Frame': 'src/types/Frame.ts',
    'MediaArtifact': 'src/types/MediaArtifact.ts',
    'Storyboard': 'src/types/Storyboard.ts',
    'StoryboardView': 'src/types/StoryboardView.ts',
    'StudioSkill': 'src/skills/StudioSkill.ts',
    'skills': 'src/skills/index.ts',
    'templates': 'src/templates/index.ts',
    'Generation': 'src/types/Generation.ts',
    'GenerationService': 'src/types/GenerationService.ts',
    'Lightbox': 'src/types/Lightbox.ts',
    'StudioCapabilities': 'src/types/StudioCapabilities.ts',
    'StudioEvents': 'src/types/StudioEvents.ts',
    'StudioOperation': 'src/types/StudioOperation.ts',
    'Variant': 'src/types/Variant.ts',
    'types': 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
