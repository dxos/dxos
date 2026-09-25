//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    MagazinePlugin: 'src/MagazinePlugin.ts',
    plugin: 'src/plugin.tsx',
    skills: 'src/skills/index.ts',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    translations: 'src/translations.ts',
    atoms: 'src/atoms/index.ts',
    testing: 'src/testing/index.ts',
    CreateSubscription: 'src/types/CreateSubscription.ts',
    FeedOperation: 'src/types/FeedOperation.ts',
    Magazine: 'src/types/Magazine.ts',
    MagazineEvents: 'src/types/MagazineEvents.ts',
    Subscription: 'src/types/Subscription.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' }, storybook: true },
});
