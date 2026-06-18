//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { type Obj } from '@dxos/echo';
import { type Thread } from '@dxos/types';

import { meta } from '#meta';

import { type CommentState, type ViewStore } from '../types';

export const Settings = Capability.make<Atom.Writable<import('./Settings').Settings>>(`${meta.id}.capability.settings`);

/** Comment configuration contributed per typename by plugins that support commenting. */
export type CommentConfig = AppCapabilities.CommentConfig;
export const CommentConfig: Capability.InterfaceDef<AppCapabilities.CommentConfig> = AppCapabilities.CommentConfig;

/** Comment state (drafts, toolbar state, current selection). */
export const State = Capability.make<Atom.Writable<CommentState>>(`${meta.id}.capability.state`);

/** Per-subject view state (e.g., showResolvedThreads). */
export const ViewState = Capability.make<Atom.Writable<ViewStore>>(`${meta.id}.capability.viewState`);

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

export const AgentRunner = Capability.make<AgentRunner>(`${meta.id}.capability.agentRunner`);
