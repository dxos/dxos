//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { AssistantCapabilities } from '#types';

import { TaskSlashCommands, ViewSlashCommands } from '../commands/index.ts';

/** The chat's own commands; skills are offered beside them by the prompt. */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(AssistantCapabilities.SlashCommands, [...TaskSlashCommands, ...ViewSlashCommands]);
  }),
);
