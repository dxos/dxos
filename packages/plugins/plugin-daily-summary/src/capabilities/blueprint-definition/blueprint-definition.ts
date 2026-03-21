//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { DailySummaryBlueprint } from '../../blueprints';

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contributes(AppCapabilities.BlueprintDefinition, DailySummaryBlueprint)),
);
