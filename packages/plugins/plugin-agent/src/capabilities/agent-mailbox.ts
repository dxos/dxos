//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import { Context } from '@dxos/context';
import { type EdgeHttpClient, EdgeHttpClientService, type EdgeRequestArgs } from '@dxos/edge-client';

import { AgentMailbox } from '#types';

/** EDGE route of a mailbox. */
const mailboxPath = (handle: string): string => `/compute/email/mailboxes/${encodeURIComponent(handle)}`;

/** {@link AgentMailbox.Service} over EDGE's `/compute/email/mailboxes/:handle`, signed with the user's identity. */
export const makeEdgeAgentMailbox = (edge: EdgeHttpClient): AgentMailbox.Service => {
  // The EDGE client has no Effect form, so this is the one Promise boundary.
  const call = Effect.fnUntraced(function* <A, I>(
    handle: string,
    args: EdgeRequestArgs,
    schema: Schema.Codec<A, I>,
    route = '',
  ) {
    const data = yield* Effect.tryPromise({
      try: () => edge.request(Context.default(), `${mailboxPath(handle)}${route}`, args),
      catch: (cause) =>
        new AgentMailbox.AgentMailboxError({
          message: cause instanceof Error ? cause.message : 'EDGE mailbox request failed.',
          cause,
        }),
    });
    return yield* Schema.decodeUnknownEffect(schema)(data).pipe(
      Effect.mapError(
        (cause) => new AgentMailbox.AgentMailboxError({ message: 'Unexpected mailbox answer from EDGE.', cause }),
      ),
    );
  });

  return {
    claim: ({ handle, allowedSenders, ...body }) =>
      call(
        handle,
        { method: 'PUT', body: { ...body, allowedSenders: [...allowedSenders] } },
        AgentMailbox.MailboxStatus,
      ),
    release: (handle) => call(handle, { method: 'DELETE' }, AgentMailbox.MailboxStatus),
    status: (handle) => call(handle, { method: 'GET' }, AgentMailbox.MailboxStatus),
    send: ({ handle, ...body }) => call(handle, { method: 'POST', body }, AgentMailbox.SendResult, '/send'),
  };
};

const AgentMailboxLayerSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [EdgeHttpClientService],
    provides: [AgentMailbox.AgentMailboxService],
  },
  () => Layer.effect(AgentMailbox.AgentMailboxService, EdgeHttpClientService.pipe(Effect.map(makeEdgeAgentMailbox))),
);

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(Capabilities.LayerSpec, AgentMailboxLayerSpec)),
);
