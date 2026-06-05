//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { type Obj } from '@dxos/echo';
import { type Channel, type Message, type Thread } from '@dxos/types';

import { meta } from '#meta';

import { type ThreadState, type ViewStore } from '../types';

export const Settings = Capability.make<Atom.Writable<import('./Settings').Settings>>(`${meta.id}.capability.settings`);

/** Comment configuration contributed per typename by plugins that support commenting. */
export type CommentConfig = AppCapabilities.CommentConfig;
export const CommentConfig: Capability.InterfaceDef<AppCapabilities.CommentConfig> = AppCapabilities.CommentConfig;

/** Thread state (drafts, toolbar state, current selection). */
export const State = Capability.make<Atom.Writable<ThreadState>>(`${meta.id}.capability.state`);

/** Per-subject view state (e.g., showResolvedThreads). */
export const ViewState = Capability.make<Atom.Writable<ViewStore>>(`${meta.id}.capability.view-state`);

/**
 * Runs one comment-thread agent turn against a thread/subject pair.
 *
 * `run` may depend on `Capability.Service` so implementations can read
 * `AgentIdentity` and any other contributed capabilities. The caller
 * (RespondToThread operation handler) already provides `Capability.Service`.
 *
 * The default implementation (built atop AiSession) is not yet wired; storybook
 * and tests contribute stub implementations via `Capability.contributes` to
 * exercise the trigger plumbing without making network calls.
 */
export interface AgentRunner {
  run(input: { thread: Thread.Thread; subject: Obj.Any }): Effect.Effect<void, Error, Capability.Service>;
}

export const AgentRunner = Capability.make<AgentRunner>(`${meta.id}.capability.agent-runner`);

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
export const ChannelBackend = Capability.make<ChannelBackendProvider>(`${meta.id}.capability.channel-backend`);
