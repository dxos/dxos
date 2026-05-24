//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

import { type MessageExtractor as MessageExtractorImpl } from '../capabilities/MessageExtractor';

// Inline import to avoid `Settings` namespace alias colliding with the
// `Settings` capability export below.
export const Settings = Capability.make<Atom.Writable<import('./Settings').Settings>>(`${meta.id}.capability.settings`);

/**
 * Plugins contribute message extractors via this capability.
 * Multiple plugins may register; the ExtractMessage operation selects one based on match() confidence.
 */
export const MessageExtractor = Capability.make<MessageExtractorImpl>(`${meta.id}.capability.messageExtractor`);
