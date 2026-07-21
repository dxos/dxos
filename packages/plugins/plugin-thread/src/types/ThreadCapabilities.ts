//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { type Obj } from '@dxos/echo';
import { type Channel, type Message } from '@dxos/types';

import { meta } from '#meta';

/**
 * A pluggable message backend for a `Channel`. Providers are contributed by
 * plugins and resolved by `Channel.backend.kind`.
 */
export interface ChannelBackendProvider {
  /** Stable backend id; matches `Channel.backend.kind`. */
  kind: string;
  /** Human-readable label shown in the create-channel form. */
  label: string;
  /** Icon name (phosphor) for the create-channel form. */
  icon?: string;
  /**
   * Per-backend create-form inputs (a struct; excludes the `kind` discriminant
   * and the channel `name`, which the panel adds). Empty struct when the backend
   * needs no extra input (e.g. the local feed).
   */
  createFields: Schema.Schema.AnyNoContext;
  /** Builds the provider's config object from the collected create-form inputs. */
  makeConfig: (options: Record<string, unknown>) => Obj.Any;
  /**
   * Subscribes to the channel's messages. Invokes `onMessages` with the current
   * list immediately and on every change. Returns an unsubscribe function.
   */
  subscribe: (channel: Channel.Channel, onMessages: (messages: readonly Message.Message[]) => void) => () => void;
  /** Sends a message through the backend. */
  send: (channel: Channel.Channel, message: Message.Message) => Effect.Effect<void, Error, Capability.Service>;
  /** Whether the channel is read-only. Defaults to "channel has foreign-key Obj.Meta". */
  readOnly?: (channel: Channel.Channel) => boolean;
}

/** Registry of channel-message backends. Collect with `Capability.getAll`. */
export const ChannelBackend = Capability.make<ChannelBackendProvider>()(
  `${meta.profile.key}.capability.channelBackend`,
);
