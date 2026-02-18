//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { ThreadBlueprint } from '../../blueprints';

export type BlueprintCapabilities = [
  Capability.Capability<typeof AppCapabilities.Functions>,
  Capability.Capability<typeof AppCapabilities.BlueprintDefinition>,
];

const blueprintDefinition = Capability.makeModule<[], BlueprintCapabilities>(() =>
  Effect.succeed([
    Capability.contributes(AppCapabilities.Functions, ThreadBlueprint.functions),
    Capability.contributes(AppCapabilities.BlueprintDefinition, ThreadBlueprint.make()),
  ]),
);

export default blueprintDefinition;
