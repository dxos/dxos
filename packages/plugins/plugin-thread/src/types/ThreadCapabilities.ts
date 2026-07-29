//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { type Obj } from '@dxos/echo';
import { type Channel, type Message, type Reaction } from '@dxos/types';

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
  /**
   * Deletes a message. Omitted by backends with no local-write path back to the source (a bridged
   * Slack channel), which hides the affordance rather than failing at the click.
   */
  remove?: (channel: Channel.Channel, message: Message.Message) => Effect.Effect<void, Error, Capability.Service>;
  /**
   * Subscribes to the channel's reactions, same contract as {@link subscribe}. Omitted by backends
   * that carry no reactions; the UI then renders none.
   */
  subscribeReactions?: (
    channel: Channel.Channel,
    onReactions: (reactions: readonly Reaction.Reaction[]) => void,
  ) => () => void;
  /** Appends a reaction. Required for the reaction affordance to appear. */
  appendReaction?: (
    channel: Channel.Channel,
    reaction: Reaction.Reaction,
  ) => Effect.Effect<void, Error, Capability.Service>;
  /** Tombstones the author's own reaction (un-react). Required alongside {@link appendReaction}. */
  removeReaction?: (
    channel: Channel.Channel,
    reaction: Reaction.Reaction,
  ) => Effect.Effect<void, Error, Capability.Service>;
  /** Whether the channel is read-only. Defaults to "channel has foreign-key Obj.Meta". */
  readOnly?: (channel: Channel.Channel) => boolean;
}

/** Registry of channel-message backends. Collect with `Capability.getAll`. */
export const ChannelBackend = Capability.make<ChannelBackendProvider>(`${meta.profile.key}.capability.channel-backend`);
