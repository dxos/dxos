//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';

/**
 * A Discord channel mapped to the current space.
 */
export const ChannelBinding = Schema.Struct({
  channelId: Schema.String,
  channelName: Schema.String,
});

export interface ChannelBinding extends Schema.Schema.Type<typeof ChannelBinding> {}

/**
 * Core ECHO object representing a Discord bot instance.
 * Stores identity, credentials, and guild binding.
 * NOTE: In the current phase the HALO keypair lives directly in this object.
 * A future phase will promote the bot to its own ECHO identity.
 */
export const Bot = Schema.Struct({
  name: Schema.optional(Schema.String),
  token: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  applicationId: Schema.optional(Schema.String),
  did: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  publicKey: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  privateKey: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  guildId: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  guildName: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  channels: Schema.optional(Schema.Array(ChannelBinding).pipe(FormInputAnnotation.set(false))),
  status: Schema.optional(Schema.Literal('disconnected', 'connected', 'error').pipe(FormInputAnnotation.set(false))),
  inviteUrl: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.discord.bot',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--discord-logo--regular',
    hue: 'indigo',
  }),
);

export interface Bot extends Schema.Schema.Type<typeof Bot> {}

/** OAuth scopes required for the Discord bot. */
const BOT_SCOPES = ['bot', 'applications.commands'];

/** Bot permissions (send messages, read message history). */
const BOT_PERMISSIONS = '3072';

/**
 * Generates the Discord OAuth invite URL for adding the bot to a guild.
 */
export const generateInviteUrl = (applicationId: string): string => {
  const params = new URLSearchParams({
    client_id: applicationId,
    scope: BOT_SCOPES.join(' '),
    permissions: BOT_PERMISSIONS,
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
};

/**
 * Creates a new Bot ECHO object.
 */
export const make = (props: { name?: string; applicationId?: string } = {}) => {
  const inviteUrl = props.applicationId ? generateInviteUrl(props.applicationId) : undefined;
  return Obj.make(Bot, {
    name: props.name,
    applicationId: props.applicationId,
    channels: [],
    status: 'disconnected',
    inviteUrl,
  });
};

/**
 * Type guard for Bot instances.
 */
export const instanceOf = (value: unknown): value is Bot => Obj.instanceOf(Bot, value);
