//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';

import { meta } from '../../meta';

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contributes(Capabilities.ReactSurface, [])),
);
