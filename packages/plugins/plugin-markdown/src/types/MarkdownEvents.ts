//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';

import { MarkdownNamespace } from '../namespace.ts';

/**
 * The markdown feature's start event. Cross-plugin markdown contributions (editor extensions,
 * comment/anchor integrations) activate here - a feature integrating WITH markdown loads when
 * markdown starts, not when its own plugin does. Fired on demand and by the host's idle trickle.
 */
export const Start = ActivationEvent.pluginStart(MarkdownNamespace.key);
