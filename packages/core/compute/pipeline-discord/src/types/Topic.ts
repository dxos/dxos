//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';

/**
 * A conversation topic recovered from a crawled channel: either an entire subthread conversation,
 * or a grouped run of related messages between participants on a main thread. Bounded by the first
 * and last message id (snowflakes, so the range is also chronological) and keyed by foreign key
 * `{ source: 'discord.com', id: '<threadId>#<startMessageId>' }` so re-detection upserts.
 */
export class Topic extends Type.makeObject<Topic>(DXN.make('org.dxos.type.discordTopic', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.annotate({ title: 'Name' }), Schema.optional),
    summary: Schema.String.pipe(Schema.annotate({ title: 'Summary' }), Schema.optional),
    /** Crawl target the topic belongs to (a channel id or a thread's own channel id). */
    threadId: Schema.String.annotate({ title: 'Thread' }),
    /** Stable source-native author ids, in order of first appearance. */
    participants: Schema.Array(Schema.String).annotate({ title: 'Participants' }),
    /** Display labels matching {@link participants} (best known at detection time). */
    participantLabels: Schema.Array(Schema.String).pipe(Schema.optional),
    startMessageId: Schema.String.annotate({ title: 'First message' }),
    endMessageId: Schema.String.annotate({ title: 'Last message' }),
    startedAt: Schema.String.pipe(Schema.annotate({ title: 'Started' }), Schema.optional),
    endedAt: Schema.String.pipe(Schema.annotate({ title: 'Ended' }), Schema.optional),
    messageCount: Schema.Number.pipe(Schema.annotate({ title: 'Messages' }), Schema.optional),
  }).pipe(
    Annotation.IconAnnotation.set({ icon: 'ph--chats-circle--regular', hue: 'purple' }),
    Schema.annotate({ description: 'A detected conversation topic within a crawled channel.' }),
  ),
) {}

export const make = (props: Obj.MakeProps<typeof Topic>): Topic => Obj.make(Topic, props);

export const instanceOf = (value: unknown): value is Topic => Obj.instanceOf(Topic, value);
