//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { TableBlueprint } from '../../blueprints';

// TODO(wittjosiah): Remove? All table ops other than resizing columns are more generically handled as schema ops.
const blueprintDefinition = Capability.makeModule<
  [],
  Capability.Capability<typeof AppCapabilities.BlueprintDefinition>[]
>(() => Effect.succeed([Capability.contributes(AppCapabilities.BlueprintDefinition, TableBlueprint)]));

export default blueprintDefinition;
