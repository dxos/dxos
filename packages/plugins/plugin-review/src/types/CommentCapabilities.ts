//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { ReviewNamespace } from '../namespace.ts';
import * as ReviewCapabilities from './ReviewCapabilities.ts';

export const Settings = Capability.makeSingleton<Atom.Writable<import('./Settings.ts').Settings>>()(
  `${ReviewNamespace.key}.capability.settings`,
);

/** Comment configuration contributed per typename by plugins that support commenting. */
export type CommentConfig = AppCapabilities.CommentConfig;
export const CommentConfig: Capability.InterfaceDef<AppCapabilities.CommentConfig> = AppCapabilities.CommentConfig;

/** Comment state (drafts, toolbar state, current selection). */
export const State = Capability.makeSingleton<Atom.Writable<ReviewCapabilities.CommentState>>()(
  `${ReviewNamespace.key}.capability.state`,
);
