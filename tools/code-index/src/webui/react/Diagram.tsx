//
// Copyright 2026 DXOS.org
//

import React, { useLayoutEffect, useRef } from 'react';

import { type Scene } from '@dxos/diagram';
import { SceneSvg } from '@dxos/plugin-illustrator/SceneSvg';

export type DiagramIslandProps = {
  readonly objects: readonly Scene.WorldObject[];
};

/** Screen px per scene unit: the scene's 18px box labels then read at the canvas's ~13px text size. */
const SCALE = 0.7;

/**
 * plugin-illustrator's SVG renderer, drawn inside the Solid canvas. The SVG fills its parent by
 * default, which shrinks a large diagram to unreadable text in the narrow canvas, so it is pinned to
 * a fixed scale of its scene and the panel scrolls instead.
 */
export const DiagramIsland = ({ objects }: DiagramIslandProps) => {
  const wrapper = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const svg = wrapper.current?.querySelector('svg');
    if (svg) {
      const { width, height } = svg.viewBox.baseVal;
      svg.style.width = `${width * SCALE}px`;
      svg.style.height = `${height * SCALE}px`;
    }
  }, [objects]);
  return (
    <div ref={wrapper} className='overflow-x-auto'>
      <SceneSvg objects={objects} classNames='block max-w-none' />
    </div>
  );
};
