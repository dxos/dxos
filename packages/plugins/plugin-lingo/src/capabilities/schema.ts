//
// Copyright 2026 DXOS.org
//

import { Language, Vocabulary, Word } from '#types';

/**
 * Schemas this plugin registers, loaded on demand: the capability activates at idle,
 * so naming them here keeps them out of the plugin body's module graph.
 */
export default [Language.Language, Vocabulary.Vocabulary, Word.Word];
