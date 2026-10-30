//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'ns/Templates': 'src/Templates.ts',
    'templates': 'src/templates/index.ts',
    'ProjectOperationHandlerSet': 'src/operations/ProjectOperationHandlerSet.ts',
    'ProjectSkill': 'src/skills/project/ProjectSkill.ts',
    'index': 'src/index.ts',
    'skills': 'src/skills/index.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'operations': 'src/operations/index.ts',
    'testing': 'src/testing/index.ts',
    'translations': 'src/translations.ts',
    'Feature': 'src/types/Feature.ts',
    'FeatureEmbed': 'src/types/FeatureEmbed.ts',
    'FeatureLink': 'src/types/FeatureLink.ts',
    'FeatureMap': 'src/types/FeatureMap.ts',
    'FeatureMapView': 'src/types/FeatureMapView.ts',
    'FeatureSpec': 'src/types/FeatureSpec.ts',
    'LegacyFeature': 'src/types/LegacyFeature.ts',
    'LegacyShowcase': 'src/types/LegacyShowcase.ts',
    'LegacySpec': 'src/types/LegacySpec.ts',
    'FeatureOperation': 'src/types/FeatureOperation.ts',
    'ProjectCapabilities': 'src/types/ProjectCapabilities.ts',
    'ProjectMailboxOperation': 'src/types/ProjectMailboxOperation.ts',
    'ProjectOperation': 'src/types/ProjectOperation.ts',
    'ProjectView': 'src/types/ProjectView.ts',
    'ProjectsEvents': 'src/types/ProjectsEvents.ts',
    'Settings': 'src/types/Settings.ts',
    'Showcase': 'src/types/Showcase.ts',
    'SpecText': 'src/types/SpecText.ts',
    'types': 'src/types/index.ts',
  },
  jsx: 'react',
  // The first story in a file pays the whole lazy module-load bill — tens of seconds, against a
  // couple for each story after it — which the 15s browser-mode default cannot cover.
  test: { node: true, storybook: { timeout: 60_000 }, workerd: true },
});
