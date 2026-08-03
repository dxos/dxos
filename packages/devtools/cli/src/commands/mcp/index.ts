//
// Copyright 2026 DXOS.org
//

import * as Command from '@effect/cli/Command';

import { call } from './call';
import { connect } from './connect';
import { tools } from './tools';

export const mcp = Command.make('mcp').pipe(
  Command.withDescription('Interact with MCP servers (e.g. the DXOS space MCP server).'),
  Command.withSubcommands([connect, tools, call]),
);
