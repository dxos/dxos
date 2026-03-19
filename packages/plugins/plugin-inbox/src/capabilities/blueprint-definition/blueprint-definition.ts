//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { CalendarBlueprint, InboxBlueprint, InboxSendBlueprint } from '../../blueprints';

const blueprintDefinition = Capability.makeModule(() =>
  Effect.succeed([
    Capability.contributes(AppCapabilities.BlueprintDefinition, InboxBlueprint),
    Capability.contributes(AppCapabilities.BlueprintDefinition, InboxSendBlueprint),
    Capability.contributes(AppCapabilities.BlueprintDefinition, CalendarBlueprint),
  ]),
);

export default blueprintDefinition;
