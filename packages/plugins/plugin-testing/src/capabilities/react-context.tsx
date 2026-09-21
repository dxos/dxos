//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { Layout } from '#components';

export const ReactContext = AppCapability.reactContext(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactContext, {
      id: 'storybook-layout',
      context: Layout,
    }),
  ),
);
