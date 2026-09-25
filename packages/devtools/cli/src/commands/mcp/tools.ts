//
// Copyright 2026 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Command from 'effect/unstable/cli/Command';

import { CommandConfig, FormBuilder, print } from '@dxos/cli-util';

import { McpProtocolError, ToolsListResult, initialize, request } from './client.ts';
import { requireSession, serverUrlOption } from './util.ts';

export const tools = Command.make(
  'tools',
  {
    url: serverUrlOption,
  },
  Effect.fn(function* ({ url }) {
    const { json, profile } = yield* CommandConfig;
    const session = yield* requireSession(profile, url);

    const result = yield* Effect.tryPromise({
      try: async () => {
        await initialize(session, { profile });
        return request(session, 'tools/list', {}, ToolsListResult, { profile });
      },
      catch: (error) => new McpProtocolError({ message: `Failed to list tools on ${session.serverUrl}`, cause: error }),
    });

    if (json) {
      yield* Console.log(JSON.stringify(result.tools, null, 2));
    } else {
      const builder = result.tools.reduce(
        (acc, tool) => acc.pipe(FormBuilder.set(tool.name, tool.description ?? '')),
        FormBuilder.make({ title: 'Tools' }),
      );
      yield* Console.log(print(FormBuilder.build(builder)));
    }
  }),
).pipe(Command.withDescription('List the tools exposed by a connected MCP server.'));
