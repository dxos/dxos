//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';

import { CalendarBlueprint, InboxBlueprint } from '../blueprints';

export { CalendarBlueprint, InboxBlueprint };

type BlueprintCapabilities = (
  | Capability.Capability<typeof Capabilities.Functions>
  | Capability.Capability<typeof Capabilities.BlueprintDefinition>
)[];

const blueprintDefinition = Capability.makeModule<[], BlueprintCapabilities>(() => [
  Capability.contributes(Capabilities.Functions, InboxBlueprint.functions),
  Capability.contributes(Capabilities.BlueprintDefinition, InboxBlueprint.make()),
  Capability.contributes(Capabilities.Functions, CalendarBlueprint.functions),
  Capability.contributes(Capabilities.BlueprintDefinition, CalendarBlueprint.make()),
]);

export default blueprintDefinition;
