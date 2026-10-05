//
// Copyright 2026 DXOS.org
//

import React, { useLayoutEffect, useRef, useState } from 'react';

import { type Scene } from '@dxos/diagram';
import { SceneSvg } from '@dxos/plugin-illustrator/SceneSvg';

export type DiagramIslandProps = {
  readonly objects: readonly Scene.WorldObject[];
  /** Repository path per scene object id, shown when the user clicks that box. */
  readonly refs: Readonly<Record<string, string>>;
};

/**
 * Screen px per scene unit. At the top the scene's 18px box labels read at the canvas's ~13px text;
 * below the floor they stop being legible, so a wider diagram scrolls instead of shrinking further.
 */
const MAX_SCALE = 0.75;
const MIN_SCALE = 0.45;

/**
 * plugin-illustrator's SVG renderer, drawn inside the Solid canvas. The SVG fills its parent by
 * default, which shrinks a large diagram to unreadable text, so it is fitted to the panel's width
 * between a legible floor and its natural size, and refitted as the split pane is resized.
 */
export const DiagramIsland = ({ objects, refs }: DiagramIslandProps) => {
  const wrapper = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<readonly string[]>([]);

  useLayoutEffect(() => {
    const container = wrapper.current;
    const svg = container?.querySelector('svg');
    if (!container || !svg) {
      return;
    }
    const fit = () => {
      const { width, height } = svg.viewBox.baseVal;
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, container.clientWidth / width));
      svg.style.width = `${width * scale}px`;
      svg.style.height = `${height * scale}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    return () => observer.disconnect();
  }, [objects]);

  const selectedRef = selection.length === 1 ? refs[selection[0]] : undefined;
  return (
    <div>
      <div ref={wrapper} className='overflow-x-auto'>
        <SceneSvg
          objects={objects}
          classNames='mx-auto block max-w-none'
          selection={selection}
          // Only boxes that depict something are worth selecting; the rest would highlight to no end.
          onSelectionChange={
            Object.keys(refs).length > 0 ? (ids) => setSelection(ids.filter((id) => id in refs)) : undefined
          }
        />
      </div>
      {selectedRef && <p className='text-description px-1 pt-1 font-mono text-xs'>{selectedRef}</p>}
    </div>
  );
};
