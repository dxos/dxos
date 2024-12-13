//
// Copyright 2024 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { bind } from 'bind-event-listener';
import { type CSSProperties, type Dispatch, type SetStateAction, useEffect, useMemo, useState } from 'react';

import { useEditorContext } from '../../hooks';
import {
  createSnap,
  getRect,
  type Rect,
  type Point,
  type Range,
  type PointTransform,
  type Dimension,
} from '../../layout';

export type TransformState = { scale: number; offset: Point };
export type TransformResult = TransformState & {
  ready: boolean;
  styles: CSSProperties;
  setTransform: Dispatch<SetStateAction<TransformState>>;
};

const defaults: TransformState = { scale: 1, offset: { x: 0, y: 0 } };

/**
 *
 */
export const useTransform = (initial: TransformState = defaults): TransformResult => {
  const { width, height } = useEditorContext();
  const [ready, setReady] = useState(false);

  // TODO(burdon): Move into context?
  const [{ scale, offset }, setTransform] = useState<TransformState>(initial);
  useEffect(() => setTransform(initial), [initial]);
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

  return { ready, scale, offset, styles, setTransform };
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
