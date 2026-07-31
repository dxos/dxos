//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom';
import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { type Obj } from '@dxos/echo';
import { type Thread } from '@dxos/types';

import { meta } from '#meta';

import { type CommentState } from '../types';

export const Settings = Capability.makeSingleton<Atom.Writable<import('./Settings').Settings>>()(
  `${meta.profile.key}.capability.settings`,
);

/** Comment configuration contributed per typename by plugins that support commenting. */
export type CommentConfig = AppCapabilities.CommentConfig;
export const CommentConfig: Capability.InterfaceDef<AppCapabilities.CommentConfig> = AppCapabilities.CommentConfig;

/** Comment state (drafts, toolbar state, current selection). */
export const State = Capability.makeSingleton<Atom.Writable<CommentState>>()(`${meta.profile.key}.capability.state`);

/**
 * Runs one comment-thread agent turn against a thread/subject pair.
 *
 * `run` may depend on `Capability.Service` so implementations can read
 * `AgentIdentity` and any other contributed capabilities. The caller
 * (RespondToThread operation handler) already provides `Capability.Service`.
 *
 * The default implementation (built atop AiSession) makes one LLM call per
 * turn; storybook and tests contribute stub implementations via
 * `Capability.contributes` to exercise the trigger plumbing without making
 * network calls.
 */
export interface AgentRunner {
  run(input: { thread: Thread.Thread; subject: Obj.Any }): Effect.Effect<void, Error, Capability.Service>;
}

export const AgentRunner = Capability.makeSingleton<AgentRunner>()(`${meta.profile.key}.capability.agentRunner`);
