//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { useObject } from '@dxos/echo-react';

import { type SlideSource } from '#deck';
import { parseSlide } from '#markdown';

/** Click count of a slide, computed from its source so navigation never waits on the rendered slide. */
export const useSlideClicks = (slide: SlideSource | undefined): number => {
  const [content] = useObject(slide?.kind === 'text' ? slide.text : undefined, 'content');
  return useMemo(() => (content === undefined ? 0 : parseSlide(content).clicks), [content]);
};
