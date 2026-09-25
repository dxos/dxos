//
// Copyright 2026 DXOS.org
//

import * as Command from 'effect/unstable/cli/Command';

import { call } from './call.ts';
import { connect } from './connect.ts';
import { serve } from './serve.ts';
import { tools } from './tools.ts';

export const mcp = Command.make('mcp').pipe(
  Command.withDescription('Run the DXOS MCP server locally (`serve`), or talk to one.'),
  Command.withSubcommands([serve, connect, tools, call]),
);
