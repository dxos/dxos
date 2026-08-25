//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';

import { DeckLayout } from '#containers';
import { useDismissToast } from '#hooks';
import { meta } from '#meta';
import type { DeckCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ platform = 'desktop' }: DeckCapabilities.DeckPluginOptions = {}) {
    // Headless on mobile: `@dxos/plugin-mobile` contributes the root there, and this plugin keeps
    // only the state and operations behind it. An empty multi-contribution is the framework's way
    // to decline — the module still covers its declared `provides` (see `#validateProvides`).
    if (platform === 'mobile') {
      return Capability.contributeAll(Capabilities.ReactRoot, []);
    }

    return Capability.contributeAll(Capabilities.ReactRoot, [
      {
        id: meta.profile.key,
        root: () => {
          const handleDismissToast = useDismissToast();

          return <DeckLayout onDismissToast={handleDismissToast} />;
        },
      },
    ]);
  }),
);
