//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Agent from '@dxos/assistant/Agent';
import { Annotation, Database, DXN, Filter, Obj, Ref, Type } from '@dxos/echo';
import { AccessToken } from '@dxos/link';

/** `Obj.Meta` key source for Discord entities; matches plugin-discord's `DISCORD_SOURCE`. */
export const DISCORD_SOURCE = 'discord.com';

/** `Obj.Meta` key source recording the parent channel of a thread chat. */
export const DISCORD_CHANNEL_SOURCE = 'discord.com/channel';

/** Foreign key identifying the chat that mirrors a Discord thread. */
export const threadKey = (threadId: string) => ({ source: DISCORD_SOURCE, id: threadId });

/** The user-editable connection settings; the agent edge is fixed when the binding is made. */
export const Properties = Schema.Struct({
  accessToken: Ref.Ref(AccessToken.AccessToken).annotate({
    title: 'Bot token',
    description: 'The Discord bot token the gateway connects with.',
  }),
  applicationId: Schema.String.annotate({
    title: 'Application ID',
    description: 'The Discord application (bot) id.',
  }),
  guildId: Schema.optional(
    Schema.String.annotate({
      title: 'Server ID',
      description: 'The Discord server (guild) the bot listens in.',
    }),
  ),
  channels: Schema.Array(Schema.String).annotate({
    title: 'Channels',
    description: 'Discord channel ids the bot listens in.',
  }),
});

export type Properties = Schema.Schema.Type<typeof Properties>;

/**
 * Binds an interlocutor agent to a Discord bot: the EDGE gateway connects with the token and routes
 * messages from the listed channels' threads to the agent.
 */
export class DiscordBinding extends Type.makeObject<DiscordBinding>(
  DXN.make('org.dxos.type.agent.discordBinding', '0.1.0'),
)(
  Schema.Struct({
    /** The bound agent; a reverse edge, so the binding is parented to it explicitly in {@link make}. */
    agent: Ref.Ref(Agent.Agent).pipe(Annotation.FormInputAnnotation.set(false)),
    ...Properties.fields,
  }).pipe(
    Annotation.LabelAnnotation.set(['applicationId']),
    Annotation.IconAnnotation.set({ icon: 'ph--discord-logo--regular', hue: 'indigo' }),
  ),
) {}

export type MakeProps = Omit<Obj.MakeProps<typeof DiscordBinding>, 'agent' | 'channels'> & {
  agent: Agent.Agent;
  channels?: readonly string[];
};

/** Creates a binding owned by the agent, so it cascades when the agent is deleted. */
export const make = ({ agent, channels, ...props }: MakeProps): DiscordBinding =>
  Obj.make(DiscordBinding, {
    ...props,
    agent: Ref.make(agent),
    channels: [...(channels ?? [])],
    [Obj.Parent]: agent,
  });

/** Resolves the agent's Discord binding, if any. */
export const loadForAgent = (agent: Agent.Agent): Effect.Effect<DiscordBinding | undefined, never, Database.Service> =>
  // A child-of filter rather than a `.children()` traversal, which EDGE's query planner cannot run.
  Database.query(Filter.and(Filter.type(DiscordBinding), Filter.childOf(agent))).run.pipe(
    Effect.map((bindings) => bindings.at(0)),
    Effect.orDie,
  );
