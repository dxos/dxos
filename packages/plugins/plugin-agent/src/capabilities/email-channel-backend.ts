//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import { Context } from '@dxos/context';
import { Filter, Obj } from '@dxos/echo';
import { type EdgeHttpClient, type EdgeRequestArgs } from '@dxos/edge-client';
import { BaseError } from '@dxos/errors';
import { invariant } from '@dxos/invariant';
import { EID } from '@dxos/keys';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ThreadCapabilities from '@dxos/plugin-thread/ThreadCapabilities';
import type * as ThreadOperation from '@dxos/plugin-thread/ThreadOperation';
import { type Channel } from '@dxos/types';

import { AgentChannels, AgentEmail } from '#types';

export class AgentEmailError extends BaseError.extend('AgentEmailError', 'Agent email request failed.') {}

/** Resolves the EDGE client that signs mailbox requests with the user's identity. */
export type EdgeClientResolver = Effect.Effect<EdgeHttpClient, AgentEmailError, Capability.Service>;

/** The app's client; absent on EDGE itself, which never claims a mailbox. */
export const appEdgeClient: EdgeClientResolver = Effect.gen(function* () {
  const [client] = yield* Capability.getAll(ClientCapabilities.Client);
  if (!client) {
    return yield* Effect.fail(new AgentEmailError({ message: 'Claiming an address needs the app client.' }));
  }
  return client.edge.http;
});

export type EmailChannelBackendOptions = {
  /** Where the EDGE client comes from; the app's client by default. */
  edgeClient?: EdgeClientResolver;
};

/**
 * Email channel backend: connecting the channel claims the agent's address on EDGE, whose email-service routes each
 * email thread into its own chat of the agent and mails the agent's replies. Nothing is sent from here: the agent
 * answers mail, it does not start it.
 */
export const makeEmailChannelBackend = ({
  edgeClient = appEdgeClient,
}: EmailChannelBackendOptions = {}): ThreadCapabilities.ChannelBackendProvider => ({
  kind: AgentEmail.BACKEND_KIND,
  label: 'Email',
  icon: 'ph--envelope--regular',
  createFields: AgentEmail.Properties,
  makeConfig: (options) => {
    invariant(Schema.is(AgentEmail.Properties)(options), 'Invalid email channel options.');
    return AgentEmail.make(options);
  },
  // Inbound mail reaches the agent's chats through EDGE, not this channel's article.
  subscribe: (_channel, onMessages) => {
    onMessages([]);
    return () => {};
  },
  send: () =>
    Effect.fail(new AgentEmailError({ message: 'An agent answers email; it cannot start a new email thread yet.' })),
  readOnly: () => true,
  connection: {
    start: (channel) =>
      Effect.gen(function* () {
        const { config, spaceId } = yield* loadConfig(channel);
        const agent = yield* findAgent(channel);
        const edge = yield* edgeClient;
        return toConnectionStatus(
          yield* callMailbox(edge, config.handle, {
            method: 'PUT',
            body: {
              spaceId,
              agent: EID.make({ spaceId, entityId: agent }),
              channel: EID.make({ spaceId, entityId: channel.id }),
              ...(config.displayName ? { displayName: config.displayName } : {}),
              allowedSenders: [...config.allowedSenders],
            },
          }),
          spaceId,
        );
      }),
    stop: (channel) =>
      Effect.gen(function* () {
        const { config, spaceId } = yield* loadConfig(channel);
        const edge = yield* edgeClient;
        return toConnectionStatus(yield* callMailbox(edge, config.handle, { method: 'DELETE' }), spaceId);
      }),
    status: (channel) =>
      Effect.gen(function* () {
        const { config, spaceId } = yield* loadConfig(channel);
        const edge = yield* edgeClient;
        return toConnectionStatus(yield* callMailbox(edge, config.handle, { method: 'GET' }), spaceId);
      }),
  },
});

/** Contributes the email channel backend. */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(ThreadCapabilities.ChannelBackend, makeEmailChannelBackend());
  }),
);

/**
 * The mailbox as a backend-neutral connection status. A handle another space holds reads as not running here, with
 * the reason, so the user picks another address.
 */
export const toConnectionStatus = (
  status: AgentEmail.MailboxStatus,
  spaceId: string,
): ThreadOperation.ConnectionStatus => {
  const ours = status.config?.spaceId === spaceId;
  return {
    running: ours,
    state: ours ? 'ready' : status.config ? 'taken' : 'idle',
    detail: `${status.address} · ${status.threads} ${status.threads === 1 ? 'thread' : 'threads'} · ${status.received} received · ${status.sent} sent`,
    error: status.config && !ours ? `${status.address} is taken.` : status.lastError,
  };
};

const callMailbox = (
  edge: EdgeHttpClient,
  handle: string,
  args: EdgeRequestArgs,
): Effect.Effect<AgentEmail.MailboxStatus, AgentEmailError> =>
  Effect.gen(function* () {
    const data = yield* Effect.tryPromise({
      try: () => edge.request(Context.default(), AgentEmail.mailboxPath(handle), args),
      catch: (cause) =>
        new AgentEmailError({
          message: cause instanceof Error ? cause.message : 'EDGE mailbox request failed.',
          cause,
        }),
    });
    return yield* Schema.decodeUnknownEffect(AgentEmail.MailboxStatus)(data).pipe(
      Effect.mapError((cause) => new AgentEmailError({ message: 'Unexpected mailbox status from EDGE.', cause })),
    );
  });

const loadConfig = (channel: Channel.Channel) =>
  Effect.gen(function* () {
    const config = yield* Effect.tryPromise({
      try: () => channel.backend.config.load(),
      catch: (cause) => new AgentEmailError({ message: 'Could not load the email channel config.', cause }),
    });
    if (!AgentEmail.instanceOf(config) || !config.handle) {
      return yield* Effect.fail(new AgentEmailError({ message: 'The channel has no email address.' }));
    }
    const spaceId = Obj.getDatabase(channel)?.spaceId;
    if (!spaceId) {
      return yield* Effect.fail(new AgentEmailError({ message: 'The channel is not in a space.' }));
    }
    return { config, spaceId };
  });

/** The agent whose channel list holds the channel: EDGE runs that agent's turns for the mailbox. */
const findAgent = (channel: Channel.Channel) =>
  Effect.gen(function* () {
    const db = Obj.getDatabase(channel);
    const lists = yield* Effect.tryPromise({
      try: async () => (db ? await db.query(Filter.type(AgentChannels.AgentChannels)).run() : []),
      catch: (cause) => new AgentEmailError({ message: 'Could not read the agents’ channel lists.', cause }),
    });
    const agent = lists.find((list) => list.channels.some((ref) => entityIdOf(ref.uri) === channel.id))?.agent;
    const agentId = agent && entityIdOf(agent.uri);
    if (!agentId) {
      return yield* Effect.fail(new AgentEmailError({ message: 'Add the channel to an agent before connecting it.' }));
    }
    return agentId;
  });

const entityIdOf = (uri: string): string | undefined => {
  const eid = EID.tryParse(uri);
  return eid ? EID.getEntityId(eid) : undefined;
};
