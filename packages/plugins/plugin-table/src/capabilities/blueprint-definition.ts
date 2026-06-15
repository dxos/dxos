//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { TableBlueprint } from '#blueprints';

// TODO(wittjosiah): Remove? All table ops other than resizing columns are more generically handled as schema ops.
// NOTE: Explicit annotation required: d.ts emit cannot portably name the inferred @dxos/compute types (TS2883).
const blueprintDefinition: () => Effect.Effect<
  Capability.Capability<typeof AppCapabilities.BlueprintDefinition>[],
  never,
  Capability.Service
> = () => Effect.succeed([Capability.contributes(AppCapabilities.BlueprintDefinition, TableBlueprint)]);

export default blueprintDefinition;
