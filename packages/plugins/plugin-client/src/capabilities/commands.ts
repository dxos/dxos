//
// Copyright 2026 DXOS.org
//

import { config, device, edge, halo } from '../commands/index.ts';

// `account` needs the OAuth callback server and `profile` a filesystem, so both are node-only
// (see the .node variant); the rest resolve through the client alone.
const commands = [config, device, edge, halo];

export default commands;
