//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { useObject } from '@dxos/echo-react';

import { type SlideSource } from '#deck';
import { extractNotes, getSpeakerLines } from '#markdown';

const slideOf = (source: SlideSource | undefined) => (source && 'slide' in source ? source.slide : undefined);

/**
 * The speaker notes of a slide as the lines read aloud: the Slide's own `notes` text, else the trailing notes comment
 * of its markdown. Reactive to edits of either.
 */
export const useSpeakerLines = (source: SlideSource | undefined): string[] => {
  const [notesRef] = useObject(slideOf(source), 'notes');
  const [notes] = useObject(notesRef, 'content');
  const text = source?.kind === 'text' ? source.text : undefined;
  const [textContent] = useObject(text, 'content');
  const markdown = source?.kind === 'markdown' ? source.content : textContent;
  return useMemo(() => getSpeakerLines(notes?.trim() ? notes : extractNotes(markdown ?? '')), [notes, markdown]);
};
