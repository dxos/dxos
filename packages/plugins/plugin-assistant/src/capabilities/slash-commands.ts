//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { AssistantCapabilities } from '#types';

import { TaskSlashCommands, ViewSlashCommands } from '../commands/index.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(AssistantCapabilities.SlashCommands, [...TaskSlashCommands, ...ViewSlashCommands]);
  }),
);
