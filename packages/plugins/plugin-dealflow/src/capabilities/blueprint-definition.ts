//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { DealTriageBlueprint, InvestmentMemoBlueprint, MeetingPrepBlueprint, SignalMonitorBlueprint } from '#blueprints';

const blueprintDefinition = Capability.makeModule(() =>
  Effect.succeed([
    Capability.contributes(AppCapabilities.BlueprintDefinition, DealTriageBlueprint),
    Capability.contributes(AppCapabilities.BlueprintDefinition, InvestmentMemoBlueprint),
    Capability.contributes(AppCapabilities.BlueprintDefinition, MeetingPrepBlueprint),
    Capability.contributes(AppCapabilities.BlueprintDefinition, SignalMonitorBlueprint),
  ]),
);

export default blueprintDefinition;
