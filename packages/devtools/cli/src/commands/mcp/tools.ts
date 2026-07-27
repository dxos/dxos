//
// Copyright 2026 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { CommandConfig, FormBuilder, print } from '@dxos/cli-util';

import { initialize, request } from './client';
import { requireSession, serverUrlOption } from './util';

export const tools = Command.make(
  'tools',
  {
    url: serverUrlOption,
  },
  Effect.fn(function* ({ url }) {
    const { json, profile } = yield* CommandConfig;
    const session = yield* requireSession(profile, url);

    yield* Effect.tryPromise(() => initialize(session, { profile }));
    const result = yield* Effect.tryPromise(() => request(session, 'tools/list', {}, { profile }));
    const entries = (result.tools ?? []) as Array<{ name: string; description?: string }>;

    if (json) {
      yield* Console.log(JSON.stringify(entries, null, 2));
    } else {
      const builder = entries.reduce(
        (acc, tool) => acc.pipe(FormBuilder.set(tool.name, tool.description ?? '')),
        FormBuilder.make({ title: 'Tools' }),
      );
      yield* Console.log(print(FormBuilder.build(builder)));
    }
  }),
).pipe(Command.withDescription('List the tools exposed by a connected MCP server.'));
