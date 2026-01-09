//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';

import { KanbanBlueprint } from '../../blueprints';

export type BlueprintCapabilities = [
  Capability.Capability<typeof Common.Capability.Functions>,
  Capability.Capability<typeof Common.Capability.BlueprintDefinition>,
];

const blueprintDefinition = Capability.makeModule<[], BlueprintCapabilities>(() =>
  Effect.succeed([
    Capability.contributes(Common.Capability.Functions, KanbanBlueprint.functions),
    Capability.contributes(Common.Capability.BlueprintDefinition, KanbanBlueprint.make()),
  ]),
);

export default blueprintDefinition;
