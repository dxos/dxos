//
// Copyright 2026 DXOS.org
//

import { database, queue, space } from '../commands/index.ts';

// Loaded by the commands module rather than imported by the plugin definition, so the command
// graph stays out of the definition's static closure.
const commands = [database, queue, space];

export default commands;
