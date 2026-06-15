//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { CalendarBlueprint, InboxBlueprint, InboxSendBlueprint } from '#blueprints';

// NOTE: Explicit annotation required: d.ts emit cannot portably name the inferred @dxos/compute types (TS2883).
const blueprintDefinition: () => Effect.Effect<
  Capability.Capability<typeof AppCapabilities.BlueprintDefinition>[],
  never,
  Capability.Service
> = () =>
  Effect.succeed([
    Capability.contributes(AppCapabilities.BlueprintDefinition, InboxBlueprint),
    Capability.contributes(AppCapabilities.BlueprintDefinition, InboxSendBlueprint),
    Capability.contributes(AppCapabilities.BlueprintDefinition, CalendarBlueprint),
  ]);

export default blueprintDefinition;
