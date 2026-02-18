//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { CalendarBlueprint, InboxBlueprint, InboxSendBlueprint } from '../../blueprints';

export { CalendarBlueprint, InboxBlueprint, InboxSendBlueprint };

export type BlueprintCapabilities = [
  Capability.Capability<typeof AppCapabilities.Functions>,
  Capability.Capability<typeof AppCapabilities.BlueprintDefinition>,
  Capability.Capability<typeof AppCapabilities.Functions>,
  Capability.Capability<typeof AppCapabilities.BlueprintDefinition>,
  Capability.Capability<typeof AppCapabilities.Functions>,
  Capability.Capability<typeof AppCapabilities.BlueprintDefinition>,
];

const blueprintDefinition = Capability.makeModule<[], BlueprintCapabilities>(() =>
  Effect.succeed([
    Capability.contributes(AppCapabilities.Functions, InboxBlueprint.functions),
    Capability.contributes(AppCapabilities.BlueprintDefinition, InboxBlueprint.make()),
    Capability.contributes(AppCapabilities.Functions, InboxSendBlueprint.functions),
    Capability.contributes(AppCapabilities.BlueprintDefinition, InboxSendBlueprint.make()),
    Capability.contributes(AppCapabilities.Functions, CalendarBlueprint.functions),
    Capability.contributes(AppCapabilities.BlueprintDefinition, CalendarBlueprint.make()),
  ]),
);

export default blueprintDefinition;
