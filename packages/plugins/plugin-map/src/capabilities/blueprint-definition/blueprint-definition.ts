//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { MapBlueprint } from '../../blueprints';

export type BlueprintCapabilities = [
  Capability.Capability<typeof AppCapabilities.BlueprintDefinition>,
  Capability.Capability<typeof AppCapabilities.Functions>,
];

const blueprintDefinition = Capability.makeModule<[], BlueprintCapabilities>(() =>
  Effect.succeed([
    Capability.contributes(AppCapabilities.BlueprintDefinition, MapBlueprint.make()),
    Capability.contributes(AppCapabilities.Functions, MapBlueprint.functions),
  ]),
);

export default blueprintDefinition;
