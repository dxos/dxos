//
// Copyright 2023 DXOS.org
//

import { Outline } from '@dxos/types';

import { Journal } from '#types';

/**
 * Schemas this plugin registers, loaded on demand: the capability activates at idle,
 * so naming them here keeps them out of the plugin body's module graph.
 */
export default [Journal.JournalEntry, Journal.Journal, Outline.Outline];
