//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { WebSearchToolkitGeneric } from '@dxos/assistant-toolkit';

export default Capability.makeModule(() =>
  Effect.succeed([Capability.contributes(AppCapabilities.Toolkit, WebSearchToolkitGeneric)]),
);
