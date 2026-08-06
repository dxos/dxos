//
// Copyright 2026 DXOS.org
//

import type * as Command from '@effect/cli/Command';

import { account, config, device, edge, halo, profile } from './commands';

// The full set: a node host has the filesystem and callback server the browser subset omits.
const commands: ReadonlyArray<Command.Command<any, any, any, any>> = [account, config, device, edge, halo, profile];

export default commands;
