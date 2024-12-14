//
// Copyright 2024 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { bind } from 'bind-event-listener';
import { type CSSProperties, useEffect, useMemo, useState } from 'react';

import { useEditorContext } from '../hooks';
import { createSnap, getRect, type Rect, type Point, type Range, type PointTransform, type Dimension } from '../layout';

// TODO(burdon): Factor out into separate hooks.

export type TransformResult = { ready: boolean; styles: CSSProperties };

/**
 *
 */
export const useTransform = (): TransformResult => {
  const { width, height, scale, offset, setTransform } = useEditorContext();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!width || !height) {
      return;
    }

    setTransform(({ scale }) => ({ scale, offset: { x: width / 2, y: height / 2 } }));
    setReady(true);
  }, [width, height]);

  const styles = useMemo(
    () => ({
      // NOTE: Order is important.
      transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
    }),
    [scale, offset],
  );

  return { ready, styles };
};

/**
 *
 */
export const useSnap = (size: Dimension): PointTransform => {
  return useMemo(() => createSnap(size), [size]);
};

/**
 * Event listener to track range bounds selection.
 */
export const useBoundingSelection = (svg: SVGSVGElement | null, cb?: (bounds: Rect | null) => void): Rect | null => {
  const [range, setRange] = useState<Partial<Range>>();
  useEffect(() => {
    if (!svg) {
      return;
    }

    return combine(
      bind(svg, {
        type: 'pointerdown',
        listener: (event) => {
          const p1: Point = { x: event.clientX, y: event.clientY };
          setRange({ p1 });
        },
      }),
      bind(svg, {
        type: 'pointermove',
        listener: (event) => {
          const p2: Point = { x: event.clientX, y: event.clientY };
          setRange((range) => (range ? { ...range, p2 } : undefined));
        },
      }),
      bind(svg, {
        type: 'pointerup',
        listener: (event) => {
          setRange((range) => {
            if (range?.p1 && range?.p2) {
              const bounds = getRect(range.p1, range.p2);
              cb?.(bounds);
            } else {
              cb?.(null);
            }

            return undefined;
          });
        },
      }),
    );
  }, [svg, cb]);

  return range?.p1 && range?.p2 ? getRect(range.p1, range.p2) : null;
};
