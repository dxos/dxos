//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { morningBriefing, emailTriage, meetingPrep, slackResponder, researchDigest } from '../blueprints';

export default Capability.makeModule(() =>
  Effect.succeed([
    Capability.contributes(AppCapabilities.BlueprintDefinition, morningBriefing),
    Capability.contributes(AppCapabilities.BlueprintDefinition, emailTriage),
    Capability.contributes(AppCapabilities.BlueprintDefinition, meetingPrep),
    Capability.contributes(AppCapabilities.BlueprintDefinition, slackResponder),
    Capability.contributes(AppCapabilities.BlueprintDefinition, researchDigest),
  ]),
);
