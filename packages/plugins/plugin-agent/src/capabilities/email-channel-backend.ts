//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import { Database, Filter, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { EID, type SpaceId } from '@dxos/keys';
import * as ThreadCapabilities from '@dxos/plugin-thread/ThreadCapabilities';
import type * as ThreadOperation from '@dxos/plugin-thread/ThreadOperation';
import { type Channel } from '@dxos/types';

import { AgentChannels, AgentEmail, AgentMailbox } from '#types';

/** Provides the mailbox service for a space's channel. */
export type MailboxLayer = (
  spaceId: SpaceId,
) => Layer.Layer<AgentMailbox.AgentMailboxService, Error, Capability.Service>;

/** The app's {@link AgentMailbox.AgentMailboxService}, resolved from the layer specs plugins contribute. */
export const appMailbox: MailboxLayer = (spaceId) =>
  Layer.unwrap(
    Capability.get(Capabilities.ServiceResolver).pipe(
      Effect.map((resolver) =>
        ServiceResolver.provide({ space: spaceId }, AgentMailbox.AgentMailboxService).pipe(
          Layer.provide(Layer.succeed(ServiceResolver.ServiceResolver, resolver)),
        ),
      ),
    ),
  );

export type EmailChannelBackendOptions = {
  /** Where the mailbox service comes from; the app's layer specs by default. */
  mailbox?: MailboxLayer;
};

/**
 * Email channel backend: connecting the channel claims the agent's address, after which EDGE's compute-service routes
 * each email thread into its own chat of the agent and mails the agent's replies. Nothing is sent from here: the
 * agent answers mail, it does not start it.
 */
export const makeEmailChannelBackend = ({
  mailbox = appMailbox,
}: EmailChannelBackendOptions = {}): ThreadCapabilities.ChannelBackendProvider => {
  /** Runs a connection step with the channel's database and the mailbox service. */
  const inSpace = <A>(
    channel: Channel.Channel,
    effect: Effect.Effect<A, Error, Database.Service | AgentMailbox.AgentMailboxService>,
  ): Effect.Effect<A, Error, Capability.Service> => {
    const db = Obj.getDatabase(channel);
    if (!db) {
      return Effect.fail(new AgentMailbox.AgentMailboxError({ message: 'The channel is not in a space.' }));
    }
    return effect.pipe(Effect.provide(Layer.mergeAll(Database.layer(db), mailbox(db.spaceId))));
  };

  return {
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
      Effect.fail(
        new AgentMailbox.AgentMailboxError({
          message: 'An agent answers email; it cannot start a new email thread yet.',
        }),
      ),
    readOnly: () => true,
    connection: {
      start: (channel) => inSpace(channel, connect(channel)),
      stop: (channel) => inSpace(channel, disconnect(channel)),
      status: (channel) => inSpace(channel, readStatus(channel)),
    },
  };
};

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
  status: AgentMailbox.MailboxStatus,
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

const connect = Effect.fnUntraced(function* (channel: Channel.Channel) {
  const { config, spaceId } = yield* loadConfig(channel);
  const agent = yield* findAgent(channel);
  const mailbox = yield* AgentMailbox.AgentMailboxService;
  // A renamed address releases the one it held first, or that handle would stay bound to the agent.
  if (config.claimedHandle && config.claimedHandle !== config.handle) {
    yield* mailbox.release(config.claimedHandle);
  }
  const status = yield* mailbox.claim({
    handle: config.handle,
    spaceId,
    agent: EID.make({ spaceId, entityId: agent }),
    channel: EID.make({ spaceId, entityId: channel.id }),
    ...(config.displayName ? { displayName: config.displayName } : {}),
    // EDGE takes an empty list literally (every sender bounces); the config means the default by it.
    allowedSenders: config.allowedSenders.length > 0 ? config.allowedSenders : AgentEmail.DEFAULT_ALLOWED_SENDERS,
  });
  Obj.update(config, (config) => {
    config.claimedHandle = config.handle;
  });
  return toConnectionStatus(status, spaceId);
});

const disconnect = Effect.fnUntraced(function* (channel: Channel.Channel) {
  const { config, spaceId } = yield* loadConfig(channel);
  const mailbox = yield* AgentMailbox.AgentMailboxService;
  const status = yield* mailbox.release(config.claimedHandle ?? config.handle);
  Obj.update(config, (config) => {
    config.claimedHandle = undefined;
  });
  return toConnectionStatus(status, spaceId);
});

/** The status of a channel whose EDGE has no mailboxes: nothing to connect to, which is not a failure to report. */
export const UNAVAILABLE_STATUS: ThreadOperation.ConnectionStatus = {
  running: false,
  state: 'unavailable',
  detail: 'Email is not available on this EDGE.',
};

const readStatus = Effect.fnUntraced(function* (channel: Channel.Channel) {
  const { config, spaceId } = yield* loadConfig(channel);
  const mailbox = yield* AgentMailbox.AgentMailboxService;
  return Option.match(yield* mailbox.status(config.claimedHandle ?? config.handle), {
    onNone: () => UNAVAILABLE_STATUS,
    onSome: (status) => toConnectionStatus(status, spaceId),
  });
});

const loadConfig = Effect.fnUntraced(function* (channel: Channel.Channel) {
  const config = yield* Database.load(channel.backend.config);
  if (!AgentEmail.instanceOf(config) || !config.handle) {
    return yield* Effect.fail(new AgentMailbox.AgentMailboxError({ message: 'The channel has no email address.' }));
  }
  return { config, spaceId: yield* Database.spaceId };
});

/** The agent whose channel list holds the channel: EDGE runs that agent's turns for the mailbox. */
const findAgent = Effect.fnUntraced(function* (channel: Channel.Channel) {
  const lists = yield* Database.query(Filter.type(AgentChannels.AgentChannels)).run.pipe(Effect.orDie);
  const agentId = lists
    .map((list) =>
      list.channels.some((ref) => entityIdOf(ref.uri) === channel.id) ? entityIdOf(list.agent.uri) : undefined,
    )
    .find((id) => id !== undefined);
  if (!agentId) {
    return yield* Effect.fail(
      new AgentMailbox.AgentMailboxError({ message: 'Add the channel to an agent before connecting it.' }),
    );
  }
  return agentId;
});

const entityIdOf = (uri: string): string | undefined => {
  const eid = EID.tryParse(uri);
  return eid ? EID.getEntityId(eid) : undefined;
};
