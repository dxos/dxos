//
// Copyright 2026 DXOS.org
//

import type * as Command from '@effect/cli/Command';

import { database, queue, space } from './commands';

// Loaded by the commands module rather than imported by the plugin definition, so the command
// graph stays out of the definition's static closure.
const commands: ReadonlyArray<Command.Command<any, any, any, any>> = [database, queue, space];

export default commands;
