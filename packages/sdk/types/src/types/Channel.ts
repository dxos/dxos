//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Feed, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/Annotation';

/** Backend kind for the default local-feed-backed channel. */
export const FeedBackendKind = 'org.dxos.channel.backend.feed';

/**
 * Multi-party conversation backed by a pluggable backend.
 *
 * The `backend.kind` discriminator names the provider (e.g. the local feed, an
 * ATProto channel); `backend.config` references a provider-owned config object
 * (a `Feed` for the default backend). Providers are contributed via the
 * `ChannelBackend` capability in `@dxos/plugin-thread`.
 */
export class Channel extends Type.makeObject<Channel>(DXN.make('org.dxos.type.channel', '0.2.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.optional),
    backend: Schema.Struct({
      /** Provider id; matches `ChannelBackendProvider.kind`. */
      kind: Schema.String,
      /** Provider-owned config object (a `Feed` for the default backend). */
      config: Ref.Ref(Obj.Unknown),
    }).pipe(FormInputAnnotation.set(false)),
  }).pipe(Annotation.IconAnnotation.set({ icon: 'ph--hash--regular', hue: 'rose' })),
) {}

export const instanceOf = (value: unknown): value is Channel => Obj.instanceOf(Channel, value);

type ChannelProps = Omit<Obj.MakeProps<typeof Channel>, 'backend'> & {
  /** Optional explicit backend; defaults to a new local feed. */
  backend?: { kind: string; config: Obj.Any };
};

/** Creates a channel object, defaulting to a local feed-backed backend. */
export const make = ({ backend, ...rest }: ChannelProps = {}) => {
  const resolved = backend ?? { kind: FeedBackendKind, config: Feed.make() };
  const channel = Obj.make(Channel, {
    backend: { kind: resolved.kind, config: Ref.make(resolved.config) },
    ...rest,
  });
  // TODO(wittjosiah): Parent should be declarative in the schema.
  Obj.setParent(resolved.config, channel);
  return channel;
};

/** Returns the backing `Feed` for a feed-backed channel (when loaded), else undefined. */
export const getFeed = (channel: Channel): Feed.Feed | undefined => {
  if (channel.backend.kind !== FeedBackendKind) {
    return undefined;
  }
  const config = channel.backend.config?.target;
  return Obj.instanceOf(Feed.Feed, config) ? config : undefined;
};
