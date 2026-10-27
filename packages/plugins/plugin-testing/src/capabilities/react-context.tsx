//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { ThemePlugin } from '@dxos/plugin-theme/testing';

import { Layout } from '#components';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactContext, {
      id: 'storybook-layout',
      // The layout's dialog and popover portals are siblings of `children`, so only contexts ordered
      // outside it reach them; without the theme's translations they render raw keys.
      dependsOn: [ThemePlugin.meta.profile.key],
      context: Layout,
    }),
  ),
);
