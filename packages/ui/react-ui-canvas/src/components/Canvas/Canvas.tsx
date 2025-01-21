//
// Copyright 2024 DXOS.org
//

import React, {
  type CSSProperties,
  type PropsWithChildren,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
  type HTMLAttributes,
} from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { defaultOffset, CanvasContext, ProjectionMapper, type ProjectionState } from '../../hooks';

export interface CanvasController {
  setProjection(projection: ProjectionState): Promise<void>;
}

export type CanvasProps = ThemedClassName<PropsWithChildren<Partial<ProjectionState> & HTMLAttributes<HTMLDivElement>>>;

/**
 * Root canvas component.
 * Manages CSS projection.
 */
export const Canvas = forwardRef<CanvasController, CanvasProps>(
  ({ children, classNames, scale: _scale = 1, offset: _offset = defaultOffset, ...props }, forwardedRef) => {
    // Size.
    const { ref, width = 0, height = 0 } = useResizeDetector();

    // Projection.
    const [{ scale, offset }, setProjection] = useState<ProjectionState>({ scale: _scale, offset: _offset });
    useEffect(() => {
      if (width && height && offset === defaultOffset) {
        setProjection({ scale, offset: { x: width / 2, y: height / 2 } });
      }
    }, [width, height, scale, offset]);

    // Projection mapper.
    const projection = useMemo(() => new ProjectionMapper(), []);
    useEffect(() => {
      projection.update({ width, height }, scale, offset);
    }, [projection, scale, offset, width, height]);

    // CSS transforms.
    const styles = useMemo<CSSProperties>(() => {
      return {
        // NOTE: Order is important.
        transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
        visibility: width && height ? 'visible' : 'hidden',
      };
    }, [scale, offset]);

    // Controller.
    useImperativeHandle(
      forwardedRef,
      () => {
        return {
          setProjection: async (projection: ProjectionState) => {
            setProjection(projection);
          },
        };
      },
      [ref],
    );

    return (
      <CanvasContext.Provider
        value={{ root: ref.current, width, height, scale, offset, styles, projection, setProjection }}
      >
        <div role='none' {...props} className={mx('absolute inset-0 overflow-hidden', classNames)} ref={ref}>
          {children}
        </div>
      </CanvasContext.Provider>
    );
  },
);
