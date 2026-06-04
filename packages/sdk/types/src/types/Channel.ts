//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Feed, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';
import { FeedAnnotation } from '@dxos/schema';

/**
 * Feed-backed multi-party conversation.
 * Used for native Slack/Discord-style channels and DMs. Messages are
 * appended to {@link feed} as `Message` objects; threaded replies (when
 * present) are reconstructed by grouping on `Message.threadId`.
 */
export const Channel = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  feed: Ref.Ref(Feed.Feed).pipe(FormInputAnnotation.set(false)),
}).pipe(
  Annotation.IconAnnotation.set({ icon: 'ph--hash--regular', hue: 'rose' }),
  FeedAnnotation.set(true),
  Type.makeObject(DXN.make('org.dxos.type.channel', '0.1.0')),
);

export type Channel = Type.InstanceType<typeof Channel>;
export const instanceOf = (value: unknown): value is Channel => Obj.instanceOf(Channel, value);

type ChannelProps = Omit<Obj.MakeProps<typeof Channel>, 'feed'>;

/** Creates a channel object with a backing feed. */
export const make = (props: ChannelProps = {}) => {
  const feed = Feed.make();
  const channel = Obj.make(Channel, {
    feed: Ref.make(feed),
    ...props,
  });
  // TODO(wittjosiah): Parent should be declarative in the schema.
  Obj.setParent(feed, channel);
  return channel;
};
