//
// Copyright 2026 DXOS.org
//

import * as Clock from 'effect/Clock';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import { Context } from '@dxos/context';
import { type EdgeHttpClient, EdgeHttpClientService, type EdgeRequestArgs } from '@dxos/edge-client';
import { log } from '@dxos/log';
import { EdgeCallFailedError } from '@dxos/protocols';

import { AgentMailbox } from '#types';

/** EDGE route of a mailbox. */
const mailboxPath = (handle: string): string => `/compute/email/mailboxes/${encodeURIComponent(handle)}`;

/** How long a mailbox read waits after EDGE first answers 404; each further 404 doubles it, up to the max. */
export const UNAVAILABLE_BACKOFF_MS = 30_000;
export const UNAVAILABLE_BACKOFF_MAX_MS = 10 * 60_000;

const isNotFound = (error: AgentMailbox.AgentMailboxError): boolean =>
  error.cause instanceof EdgeCallFailedError && error.cause.status === 404;

/** {@link AgentMailbox.Service} over EDGE's `/compute/email/mailboxes/:handle`, signed with the user's identity. */
export const makeEdgeAgentMailbox = (edge: EdgeHttpClient): AgentMailbox.Service => {
  // EDGE answers a read of any handle, bound or not, so a 404 means the deployment has no mailbox route; the UI polls
  // status, so the reads back off rather than hit EDGE (and the error tracker) every few seconds.
  let unavailable: { until: number; backoffMs: number } | undefined;
  let reported = false;

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

  const status = Effect.fnUntraced(function* (handle: string) {
    const now = yield* Clock.currentTimeMillis;
    if (unavailable && now < unavailable.until) {
      return Option.none<AgentMailbox.MailboxStatus>();
    }
    return yield* call(handle, { method: 'GET' }, AgentMailbox.MailboxStatus).pipe(
      Effect.tap(() =>
        Effect.sync(() => {
          unavailable = undefined;
        }),
      ),
      Effect.map(Option.some),
      Effect.catchIf(isNotFound, (error) =>
        Effect.sync(() => {
          // Concurrent reads that all saw the same 404 back off once, not once each.
          if (unavailable && now < unavailable.until) {
            return Option.none<AgentMailbox.MailboxStatus>();
          }
          const backoffMs = unavailable
            ? Math.min(unavailable.backoffMs * 2, UNAVAILABLE_BACKOFF_MAX_MS)
            : UNAVAILABLE_BACKOFF_MS;
          unavailable = { until: now + backoffMs, backoffMs };
          if (!reported) {
            reported = true;
            log.warn('EDGE has no agent mailbox route; mailbox reads back off', { handle, error });
          }
          return Option.none<AgentMailbox.MailboxStatus>();
        }),
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
    status,
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
