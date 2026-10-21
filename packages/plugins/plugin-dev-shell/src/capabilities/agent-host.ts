//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as ClaudeCapabilities from '@dxos/plugin-claude/ClaudeCapabilities';
import * as HelperClient from '@dxos/plugin-claude/HelperClient';

import { Shell } from '#shell';

const Endpoint = Schema.Struct({ port: Schema.Number, token: Schema.String, folder: Schema.optional(Schema.String) });

/** Asks the dev server serving this page where its agent server listens, starting it on the first request. */
export const requestEndpoint = async (url: string = Shell.AGENT_HOST_PATH): Promise<HelperClient.Endpoint> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? 'the dev server has no agent host; mount the dev shell vite plugin'
        : `the dev server's agent host answered ${response.status}: ${await response.text()}`,
    );
  }
  return Schema.decodeUnknownSync(Endpoint)(await response.json());
};

/**
 * Runs plugin-claude's coding agents through the dev server serving this page, which starts the agent server on the
 * first request (`vite-plugin/agent-host-middleware.ts`): the same server the desktop app runs as its sidecar.
 */
export default Capability.makeModule(() =>
  Effect.sync(() => {
    const client = HelperClient.make(() => requestEndpoint());
    return Capability.contribute(ClaudeCapabilities.AgentHelper, client.helper);
  }),
);
