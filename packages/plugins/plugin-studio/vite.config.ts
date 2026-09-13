//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    StudioPlugin: 'src/StudioPlugin.ts',
    plugin: 'src/plugin.tsx',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    surfaces: 'src/surfaces.ts',
    translations: 'src/translations.ts',
    Frame: 'src/types/Frame.ts',
    MediaArtifact: 'src/types/MediaArtifact.ts',
    Storyboard: 'src/types/Storyboard.ts',
    StudioSkill: 'src/skills/StudioSkill.ts',
    skills: 'src/skills/index.ts',
    Generation: 'src/types/Generation.ts',
    GenerationService: 'src/types/GenerationService.ts',
    Lightbox: 'src/types/Lightbox.ts',
    StudioCapabilities: 'src/types/StudioCapabilities.ts',
    StudioEvents: 'src/types/StudioEvents.ts',
    StudioOperation: 'src/types/StudioOperation.ts',
    Variant: 'src/types/Variant.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
