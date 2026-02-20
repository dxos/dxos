//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { TranscriptionBlueprint } from '../../blueprints';

const blueprintDefinition = Capability.makeModule<
  [],
  Capability.Capability<typeof AppCapabilities.BlueprintDefinition>[]
>(() => Effect.succeed([Capability.contributes(AppCapabilities.BlueprintDefinition, TranscriptionBlueprint)]));

export default blueprintDefinition;
