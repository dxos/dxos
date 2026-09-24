//
// Copyright 2026 DXOS.org
//

import { plugin, registry } from '../commands/index.ts';

// Loaded by the commands module rather than imported by the plugin definition, so the command
// graph stays out of the definition's static closure.
const commands = [plugin, registry];

export default commands;
