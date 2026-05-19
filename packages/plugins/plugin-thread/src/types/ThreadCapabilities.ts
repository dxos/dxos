//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

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
