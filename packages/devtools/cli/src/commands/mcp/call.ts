//
// Copyright 2026 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Args from 'effect/unstable/cli/Argument';
import * as Command from 'effect/unstable/cli/Command';
import * as Options from 'effect/unstable/cli/Flag';

import { CommandConfig } from '@dxos/cli-util';

import { McpProtocolError, ToolCallResult, initialize, request } from './client.ts';
import { requireSession, serverUrlOption } from './util.ts';

export const call = Command.make(
  'call',
  {
    tool: Args.string('tool').pipe(Args.withDescription('Tool name (see `dx mcp tools`).')),
    input: Options.string('input').pipe(
      Options.withDescription('Tool arguments as JSON.'),
      Options.withSchema(Schema.fromJsonString(Schema.Unknown)),
      Options.optional,
    ),
    url: serverUrlOption,
  },
  Effect.fn(function* ({ tool, input, url }) {
    const { profile } = yield* CommandConfig;
    const session = yield* requireSession(profile, url);

    const result = yield* Effect.tryPromise({
      try: async () => {
        await initialize(session, { profile });
        return request(
          session,
          'tools/call',
          { name: tool, arguments: Option.getOrElse(input, () => ({})) },
          ToolCallResult,
          { profile },
        );
      },
      catch: (error) => new McpProtocolError({ message: `Tool ${tool} failed`, cause: error }),
    });

    // A tool can fail without failing the RPC; surface that as a command error rather than
    // printing an error payload as if it were a result.
    if (result.isError) {
      return yield* Effect.fail(
        new McpProtocolError({ message: `Tool ${tool} failed: ${JSON.stringify(result.content)}` }),
      );
    }

    // Output is JSON either way: tool results are structured data, not a summary to format.
    yield* Console.log(JSON.stringify(result.structuredContent ?? result.content, null, 2));
  }),
).pipe(Command.withDescription('Call a tool on a connected MCP server.'));
