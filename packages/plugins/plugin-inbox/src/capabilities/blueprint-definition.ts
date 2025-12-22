//
// Copyright 2025 DXOS.org
//

import { Capabilities, type Capability, contributes, defineCapabilityModule } from '@dxos/app-framework';

import { CalendarBlueprint, InboxBlueprint } from '../blueprints';

export { CalendarBlueprint, InboxBlueprint };

type BlueprintCapabilities = (
  | Capability<typeof Capabilities.Functions>
  | Capability<typeof Capabilities.BlueprintDefinition>
)[];

const blueprintDefinition = defineCapabilityModule<[], BlueprintCapabilities>(
  (): BlueprintCapabilities => [
    contributes(Capabilities.Functions, InboxBlueprint.functions),
    contributes(Capabilities.BlueprintDefinition, InboxBlueprint.make()),
    contributes(Capabilities.Functions, CalendarBlueprint.functions),
    contributes(Capabilities.BlueprintDefinition, CalendarBlueprint.make()),
  ],
);

export default blueprintDefinition;
