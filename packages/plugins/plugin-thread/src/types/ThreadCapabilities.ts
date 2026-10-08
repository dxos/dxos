//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import { type Obj } from '@dxos/echo';
import { type Channel, type Message, type Person } from '@dxos/types';

import { meta } from '#meta';

import type * as ThreadOperation from './ThreadOperation.ts';

/** What a backend reports about a post; `void` when it has nothing to report. */
export type SendResult = ThreadOperation.SendReceipt | void;

/**
 * Threads inside a channel, for backends that have them (Discord threads and DM channels).
 * Thread ids are backend-scoped strings, always paired with the channel they belong to.
 */
export interface ChannelThreads {
  send: (
    channel: Channel.Channel,
    thread: string,
    message: Message.Message,
  ) => Effect.Effect<SendResult, Error, Capability.Service>;
}

/** A connection that must be started (a bot gateway, an IRC socket). */
export interface ChannelConnection {
  start: (channel: Channel.Channel) => Effect.Effect<ThreadOperation.ConnectionStatus, Error, Capability.Service>;
  stop: (channel: Channel.Channel) => Effect.Effect<ThreadOperation.ConnectionStatus, Error, Capability.Service>;
  status: (channel: Channel.Channel) => Effect.Effect<ThreadOperation.ConnectionStatus, Error, Capability.Service>;
}

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
  createFields: Schema.Codec<any, any>;
  /** Builds the provider's config object from the collected create-form inputs. */
  makeConfig: (options: Record<string, unknown>) => Obj.Any;
  /**
   * Subscribes to the channel's messages. Invokes `onMessages` with the current
   * list immediately and on every change. Returns an unsubscribe function.
   */
  subscribe: (channel: Channel.Channel, onMessages: (messages: readonly Message.Message[]) => void) => () => void;
  /** Sends a message through the backend; fails with a reason a person can act on. */
  send: (channel: Channel.Channel, message: Message.Message) => Effect.Effect<SendResult, Error, Capability.Service>;
  /** Whether the channel is read-only. Defaults to "channel has foreign-key Obj.Meta". */
  readOnly?: (channel: Channel.Channel) => boolean;
  /**
   * Opens a direct conversation with a person through the channel's account (a Discord DM),
   * returning its thread id; `undefined` when the person has no handle this backend knows.
   * The person's handle is the backend's business, read from `Person.identities`.
   */
  openDirect?: (
    channel: Channel.Channel,
    person: Person.Person,
  ) => Effect.Effect<string | undefined, Error, Capability.Service>;
  /** Threads inside the channel (Discord threads and DM channels). */
  threads?: ChannelThreads;
  /** A connection that must be started; absent means the backend is always available. */
  connection?: ChannelConnection;
}

/** Registry of channel-message backends. Collect with `Capability.getAll`. */
export const ChannelBackend = Capability.make<ChannelBackendProvider>()(
  `${meta.profile.key}.capability.channelBackend`,
);
