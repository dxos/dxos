//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';

import { type Vocabulary, Word } from '#types';

/** The words filed under a deck, reactively. */
export const useDeckWords = (deck: Vocabulary.Vocabulary | undefined): Word.Word[] => {
  const filter = useMemo(() => Filter.type(Word.Word, deck ? { vocabulary: Ref.make(deck) } : {}), [deck]);
  return useQuery(deck ? Obj.getDatabase(deck) : undefined, filter);
};
