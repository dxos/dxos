//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import * as Agent from '@dxos/assistant/Agent';
import type * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import { Annotation, Database, DXN, Filter, Obj, Ref, Type } from '@dxos/echo';
import { Channel } from '@dxos/types';

/** The user-editable part: which channels the agent converses in. */
export const Properties = Schema.Struct({
  // Owned, so the agent's channels stay out of the space's channel list and are deleted with the agent.
  channels: Schema.Array(Ref.Ref(Channel.Channel))
    .annotate({
      title: 'Channels',
      description: 'Channels the agent converses in (Discord, freeq, a local feed, …).',
    })
    .pipe(Annotation.SetParent.set()),
});

export type Properties = Schema.Schema.Type<typeof Properties>;

/**
 * The channels an agent converses in, whatever their backend. Parented to the agent, so it cascades
 * with it; the backend's own settings (a bot token) live on each channel's config, not here.
 */
export class AgentChannels extends Type.makeObject<AgentChannels>(DXN.make('org.dxos.type.agent.channels', '0.1.0'))(
  Schema.Struct({
    /** The agent; a reverse edge, so the object is parented to it explicitly in {@link make}. */
    agent: Ref.Ref(Agent.Agent).pipe(Annotation.FormInputAnnotation.set(false)),
    ...Properties.fields,
  }).pipe(Annotation.IconAnnotation.set({ icon: 'ph--hash--regular', hue: 'violet' })),
) {}

export type MakeProps = { agent: Agent.Agent; channels?: readonly (Channel.Channel | Ref.Ref<Channel.Channel>)[] };

/** Creates the agent's channel list, owned by the agent. */
export const make = ({ agent, channels }: MakeProps): AgentChannels =>
  Obj.make(AgentChannels, {
    agent: Ref.make(agent),
    channels: (channels ?? []).map((channel) => (Ref.isRef(channel) ? channel : Ref.make(channel))),
    [Obj.Parent]: agent,
  });

/** Resolves the agent's channel list, if it has one. */
export const loadForAgent = (agent: Agent.Agent): Effect.Effect<AgentChannels | undefined, never, Database.Service> =>
  // A child-of filter rather than a `.children()` traversal, which EDGE's query planner cannot run.
  Database.query(Filter.and(Filter.type(AgentChannels), Filter.childOf(agent))).run.pipe(
    Effect.map((lists) => lists.at(0)),
    Effect.orDie,
  );

/** Adds a channel to the agent's channel list, creating the list on first use. */
export const addChannel = Effect.fnUntraced(function* (agent: Agent.Agent, channel: Channel.Channel) {
  const list = yield* loadForAgent(agent);
  if (list) {
    Obj.update(list, (list) => {
      list.channels = [...list.channels, Ref.make(channel)];
    });
  } else {
    yield* Database.add(make({ agent, channels: [channel] }));
  }
});

/** The agent's channels, loaded. */
export const loadChannels: (agent: Agent.Agent) => Effect.Effect<Channel.Channel[], never, Database.Service> =
  Effect.fnUntraced(function* (agent) {
    const list = yield* loadForAgent(agent);
    return yield* Effect.forEach(list?.channels ?? [], (ref) => Database.load(ref).pipe(Effect.orDie));
  });

/**
 * `Message.properties` flag on a message queued for a mirrored channel's host to post (EDGE's Discord bot). The host
 * posts only these: the agent's own text in a channel conversation is not sent, it speaks through its channel skills.
 */
export const OUTBOUND_PROPERTY = 'outbound';

/**
 * Marks an operation that speaks in a channel conversation (posts, mails or relays a message). Its value names the
 * output field that says where the message went: a conversation's thread id, or a reference to the chat it was
 * recorded in.
 */
export const ChannelSendAnnotation = Annotation.make({
  id: 'org.dxos.annotation.agent.channelSend',
  schema: Schema.String,
});

/** Marks the operation as a {@link ChannelSendAnnotation channel send} whose output `field` says where it posted. */
export const channelSend = (field: string) => Operation.annotate(ChannelSendAnnotation, field);

/** The output field that says where a {@link ChannelSendAnnotation channel send} posted; undefined for other operations. */
export const channelSendField = (op: Operation.Definition.Any): string | undefined =>
  op.meta.annotations
    ? Option.getOrUndefined(Annotation.getDictionary(op.meta.annotations, ChannelSendAnnotation))
    : undefined;

/** `Obj.Meta` key source of a chat that mirrors one conversation (a channel, or a thread inside one). */
export const CHAT_SOURCE = 'org.dxos.agent/channel';

/**
 * Foreign key of the agent's chat for a channel, or for a thread inside it. Thread ids are
 * backend-scoped, so they are qualified by the channel's entity id.
 */
export const chatKey = (channelId: string, thread?: string) => ({
  source: CHAT_SOURCE,
  id: thread === undefined ? channelId : `${channelId}/${thread}`,
});

/**
 * `Obj.Meta` key source of a chat for a direct conversation the agent opened on a mirrored channel; the id is the
 * channel's entity id, so the channel's host can find the conversations it still has to open.
 */
export const DIRECT_SOURCE = 'org.dxos.agent/direct';

/** Second foreign key of a direct conversation's chat on a mirrored channel; see {@link DIRECT_SOURCE}. */
export const directKey = (channelId: string) => ({ source: DIRECT_SOURCE, id: channelId });

/** The channel (and thread) a chat mirrors, read back from its {@link chatKey}. */
export const conversationOf = (chat: Chat.Chat): { channelId: string; thread?: string } | undefined => {
  const id = Obj.getMeta(chat).keys.find(({ source }) => source === CHAT_SOURCE)?.id;
  if (id === undefined) {
    return undefined;
  }
  const slash = id.indexOf('/');
  return slash < 0 ? { channelId: id } : { channelId: id.slice(0, slash), thread: id.slice(slash + 1) };
};
