//
// Copyright 2026 DXOS.org
//

import { SpacePlugin } from '@dxos/plugin-space/testing';
import * as StoryHarness from '@dxos/storybook-testing/StoryHarness';
import * as StoryStagePlugin from '@dxos/storybook-testing/StoryStagePlugin';

/** Two peers over the space plugin, with the deck's layout operations stubbed; `plugins` render the story. */
export const decorators = (options: StoryHarness.Options & { plugins: NonNullable<StoryHarness.Options['plugins']> }) =>
  StoryHarness.decorators({
    peers: 2,
    ...options,
    plugins: [SpacePlugin.make({}), StoryStagePlugin.make(), ...options.plugins],
  });
