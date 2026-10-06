//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Feed, Obj, Ref, Type } from '@dxos/echo';
import { AccessToken } from '@dxos/link';

/** `Channel.backend.kind` of a channel that mirrors and posts to a Slack conversation. */
export const BACKEND_KIND = 'org.dxos.channel.backend.slack';

/** The token and the Slack conversation it serves; the create-channel form edits these. */
export const Properties = Schema.Struct({
  accessToken: Ref.Ref(AccessToken.AccessToken).annotate({
    title: 'Bot token',
    description: 'The Slack bot token (xoxb-…) that reads and posts; a Slack connection stores one.',
  }),
  conversationId: Schema.String.annotate({
    title: 'Conversation ID',
    description: 'The Slack conversation (C…, G… or D…) the channel mirrors and posts to.',
  }),
  teamId: Schema.optional(
    Schema.String.annotate({
      title: 'Workspace ID',
      description: 'The Slack workspace (team) the conversation belongs to.',
    }),
  ),
});

export type Properties = Schema.Schema.Type<typeof Properties>;

/**
 * Config of a Slack-backed `Channel` (`Channel.backend.config`): the token, the conversation, and the
 * feed the sync mirrors the conversation into (owned here so it is deleted with the config).
 */
export class SlackChannel extends Type.makeObject<SlackChannel>(DXN.make('org.dxos.type.slack.channel', '0.1.0'))(
  Schema.Struct({
    ...Properties.fields,
    feed: Ref.Ref(Feed.Feed).pipe(Annotation.SetParent.set(), Annotation.FormInputAnnotation.set(false)),
  }).pipe(
    Annotation.LabelAnnotation.set(['conversationId']),
    Annotation.IconAnnotation.set({ icon: 'ph--slack-logo--regular', hue: 'purple' }),
  ),
) {}

export const instanceOf = (value: unknown): value is SlackChannel => Obj.instanceOf(SlackChannel, value);

export type MakeProps = Omit<Obj.MakeProps<typeof SlackChannel>, 'feed'> & { feed?: Feed.Feed };

/** Creates a Slack channel config with a fresh mirror feed unless an existing one is adopted. */
export const make = ({ feed, ...props }: MakeProps): SlackChannel =>
  Obj.make(SlackChannel, { ...props, feed: Ref.make(feed ?? Feed.make()) });
