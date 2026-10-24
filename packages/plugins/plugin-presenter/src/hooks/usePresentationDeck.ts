//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { useMemo } from 'react';

import { type SlideSource, presentedSlidesAtom, slideSourcesAtom } from '#deck';
import { type Presentation } from '#types';

/**
 * The presentation's slides in order; re-evaluates as sections change or their targets load.
 */
export const usePresentationDeck = (presentation: Presentation.Presentation): SlideSource[] =>
  useAtomValue(useMemo(() => slideSourcesAtom(presentation), [presentation]));

/**
 * The slides shown when the presentation is presented, without those whose frontmatter sets `hide: true`.
 */
export const usePresentedSlides = (presentation: Presentation.Presentation): SlideSource[] =>
  useAtomValue(useMemo(() => presentedSlidesAtom(presentation), [presentation]));
