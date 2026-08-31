//
// Copyright 2026 DXOS.org
//

import * as Command from 'effect/unstable/cli/Command';

import { call } from './call';
import { connect } from './connect';
import { serve } from './serve';
import { tools } from './tools';

export const mcp = Command.make('mcp').pipe(
  Command.withDescription('Run the DXOS MCP server locally (`serve`), or talk to one.'),
  Command.withSubcommands([serve, connect, tools, call]),
);
