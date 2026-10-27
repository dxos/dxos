//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { useObject } from '@dxos/echo-react';

import { type SlideSource } from '#deck';
import { parseSlide } from '#markdown';

/** Click count of a slide, computed from its source so navigation never waits on the rendered slide. */
export const useSlideClicks = (slide: SlideSource | undefined): number => {
  const [textContent] = useObject(slide?.kind === 'text' ? slide.text : undefined, 'content');
  const content = slide?.kind === 'markdown' ? slide.content : textContent;
  return useMemo(() => (content === undefined ? 0 : parseSlide(content).clicks), [content]);
};
