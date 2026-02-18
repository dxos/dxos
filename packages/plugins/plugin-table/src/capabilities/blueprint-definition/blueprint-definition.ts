//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { TableBlueprint } from '../../blueprints';

export type BlueprintCapabilities = [
  Capability.Capability<typeof AppCapabilities.Functions>,
  Capability.Capability<typeof AppCapabilities.BlueprintDefinition>,
];

// TODO(wittjosiah): Remove? All table ops other than resizing columns are more generically handled as schema ops.
const blueprintDefinition = Capability.makeModule<[], BlueprintCapabilities>(() =>
  Effect.succeed([
    Capability.contributes(AppCapabilities.Functions, TableBlueprint.functions),
    Capability.contributes(AppCapabilities.BlueprintDefinition, TableBlueprint.make()),
  ]),
);

export default blueprintDefinition;
