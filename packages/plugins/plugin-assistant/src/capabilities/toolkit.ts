//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { WebSearchToolkitOpaque } from '@dxos/assistant-toolkit';

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(AppCapabilities.Toolkit, WebSearchToolkitOpaque)),
);
