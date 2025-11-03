//
// Copyright 2025 DXOS.org
//

import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { preserveOffsetOnSource } from '@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import React, { type CSSProperties, forwardRef, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { invariant } from '@dxos/invariant';
import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { type Dimension, type Point, useCanvasContext } from '@dxos/react-ui-canvas';
import { mx } from '@dxos/react-ui-theme';

import { getInputPoint, pointSubtract } from '../layout';

const size: Dimension = { width: 128, height: 128 };

export const DragTest = () => {
  const { projection } = useCanvasContext();

  const draggingRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Point>(projection.toScreen([{ x: 0, y: 0 }])[0]);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<HTMLElement>();
  const offset = useRef<Point>({ x: 0, y: 0 });
  useEffect(() => {
    const element = draggingRef.current;
    invariant(element);
    return draggable({
      element,
      // https://atlassian.design/components/pragmatic-drag-and-drop/core-package/adapters/element/drag-previews
      // TODO(burdon): Possible bug with preserveOffsetOnSource; also off by 1px.
      //  https://github.com/atlassian/pragmatic-drag-and-drop/issues/177
      // getOffset: preserveOffsetOnSource({ element, input: location.current.input }),
      onGenerateDragPreview: ({ nativeSetDragImage, location, source }) => {
        // disableNativeDragPreview({ nativeSetDragImage });
        setCustomNativeDragPreview({
          render: ({ container }) => {
            setPreview(container);
            return () => {
              setPreview(undefined);
            };
          },
          getOffset: () => {
            const getOffset = preserveOffsetOnSource({ element: source.element, input: location.current.input });
            offset.current = getOffset({ container: source.element });
            return offset.current;
          },
          nativeSetDragImage,
        });
      },
      onDropTargetChange: () => {},
      onDragStart: ({ location }) => {
        // const pos = getInputPoint(draggingRef.current!.parentElement!, location.current.input);
        setDragging(true);
      },
      onDrag: ({ location }) => {
        // const pos = getInputPoint(draggingRef.current!.parentElement!, location.current.input);
      },
      onDrop: ({ location }) => {
        const pos = getInputPoint(draggingRef.current!.parentElement!, location.current.input);
        setPos(pointSubtract(pos, offset.current));
        setDragging(false);
      },
    });
  }, []);

  return (
    <>
      <DragElement ref={draggingRef} style={{ left: pos.x, top: pos.y }} classNames={[dragging && 'opacity-50']} />
      {preview ? createPortal(<DragElement />, preview) : null}
    </>
  );
};

type DragElementProps = ThemedClassName<{ style?: CSSProperties }>;

const DragElement = forwardRef<HTMLDivElement, DragElementProps>(({ classNames, style }, forwardedRef) => (
  <div
    ref={forwardedRef}
    style={{ ...style, ...size, boxSizing: 'border-box' }}
    className={mx(
      'absolute flex items-center justify-center border border-primary-500 rounded-md text-4xl',
      classNames,
    )}
  >
    <Icon icon={'ph--crosshair-simple--regular'} size={16} />
  </div>
));
