//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';

import { CalendarBlueprint, InboxBlueprint } from '../../blueprints';

export { CalendarBlueprint, InboxBlueprint };

export type BlueprintCapabilities = [
  Capability.Capability<typeof Common.Capability.Functions>,
  Capability.Capability<typeof Common.Capability.BlueprintDefinition>,
  Capability.Capability<typeof Common.Capability.Functions>,
  Capability.Capability<typeof Common.Capability.BlueprintDefinition>,
];

const blueprintDefinition = Capability.makeModule<[], BlueprintCapabilities>(() =>
  Effect.succeed([
    Capability.contributes(Common.Capability.Functions, InboxBlueprint.functions),
    Capability.contributes(Common.Capability.BlueprintDefinition, InboxBlueprint.make()),
    Capability.contributes(Common.Capability.Functions, CalendarBlueprint.functions),
    Capability.contributes(Common.Capability.BlueprintDefinition, CalendarBlueprint.make()),
  ]),
);

export default blueprintDefinition;
