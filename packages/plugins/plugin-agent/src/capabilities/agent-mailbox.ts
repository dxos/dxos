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
import { type EdgeHttpClient, EdgeHttpClientService } from '@dxos/edge-client';

import { AgentMailbox } from '#types';

/** {@link AgentMailbox.Service} over EDGE's `/compute/email/mailboxes/:handle`, signed with the user's identity. */
export const makeEdgeAgentMailbox = (edge: EdgeHttpClient): AgentMailbox.Service => {
  // The EDGE client has no Effect form, so this is the one Promise boundary.
  const call = Effect.fnUntraced(function* <A, I>(
    request: (ctx: Context) => Promise<unknown>,
    schema: Schema.Codec<A, I>,
  ) {
    const data = yield* Effect.tryPromise({
      try: () => request(Context.default()),
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
        (ctx) => edge.claimMailbox(ctx, handle, { ...body, allowedSenders: [...allowedSenders] }),
        AgentMailbox.MailboxStatus,
      ),
    release: (handle) => call((ctx) => edge.releaseMailbox(ctx, handle), AgentMailbox.MailboxStatus),
    status: (handle) => call((ctx) => edge.getMailbox(ctx, handle), AgentMailbox.MailboxStatus),
    send: ({ handle, ...body }) => call((ctx) => edge.sendMailboxEmail(ctx, handle, body), AgentMailbox.SendResult),
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
