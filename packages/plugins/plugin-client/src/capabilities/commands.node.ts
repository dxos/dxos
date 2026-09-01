//
// Copyright 2026 DXOS.org
//

import { account, config, device, edge, halo, profile } from '../commands/index.ts';

// The full set: a node host has the filesystem and callback server the browser subset omits.
const commands = [account, config, device, edge, halo, profile];

export default commands;
