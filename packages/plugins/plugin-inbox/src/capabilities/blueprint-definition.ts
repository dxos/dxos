//
// Copyright 2025 DXOS.org
//

import { Capabilities, type Capability, contributes } from '@dxos/app-framework';

import { CalendarBlueprint, InboxBlueprint } from '../blueprints';

export { CalendarBlueprint, InboxBlueprint };

export default (): (
  | Capability<typeof Capabilities.Functions>
  | Capability<typeof Capabilities.BlueprintDefinition>
)[] => [
  contributes(Capabilities.Functions, InboxBlueprint.functions),
  contributes(Capabilities.BlueprintDefinition, InboxBlueprint.make()),
  contributes(Capabilities.Functions, CalendarBlueprint.functions),
  contributes(Capabilities.BlueprintDefinition, CalendarBlueprint.make()),
];
