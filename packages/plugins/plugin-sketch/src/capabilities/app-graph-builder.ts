//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(AppCapabilities.AppGraphBuilder, []);
  }),
);
