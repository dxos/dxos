//
// Copyright 2026 DXOS.org
//

import * as Args from '@effect/cli/Args';
import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { CommandConfig } from '@dxos/cli-util';

import { initialize, request } from './client';
import { requireSession, serverUrlOption } from './util';

export const call = Command.make(
  'call',
  {
    tool: Args.text({ name: 'tool' }).pipe(Args.withDescription('Tool name (see `dx mcp tools`).')),
    input: Options.text('input').pipe(
      Options.withDescription('Tool arguments as JSON.'),
      Options.withSchema(Schema.parseJson(Schema.Unknown)),
      Options.optional,
    ),
    url: serverUrlOption,
  },
  Effect.fn(function* ({ tool, input, url }) {
    const { json, profile } = yield* CommandConfig;
    const session = yield* requireSession(profile, url);

    yield* Effect.tryPromise(() => initialize(session, { profile }));
    const result = yield* Effect.tryPromise(() =>
      request(session, 'tools/call', { name: tool, arguments: Option.getOrElse(input, () => ({})) }, { profile }),
    );

    // A tool can fail without failing the RPC; surface that as a command error rather than
    // printing an error payload as if it were a result.
    if (result.isError) {
      return yield* Effect.fail(new Error(`Tool ${tool} failed: ${JSON.stringify(result.content)}`));
    }

    const output = result.structuredContent ?? result.content;
    yield* Console.log(json ? JSON.stringify(output, null, 2) : JSON.stringify(output, null, 2));
  }),
).pipe(Command.withDescription('Call a tool on a connected MCP server.'));
