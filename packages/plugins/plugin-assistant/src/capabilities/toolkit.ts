//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { WebSearchToolkitOpaque } from '@dxos/assistant-toolkit';

import { AssistantEvents } from '#types';

export const Toolkit = Capability.makeModule(
  'Toolkit',
  {
    provides: [AppCapabilities.Toolkit],
    activatesOn: AssistantEvents.Start,
    environments: ['node', 'workerd'],
  },
  () => Effect.succeed(Capability.contribute(AppCapabilities.Toolkit, WebSearchToolkitOpaque)),
);
