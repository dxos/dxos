//
// Copyright 2024 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import React, {
  type FC,
  type MouseEventHandler,
  type PropsWithChildren,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { invariant } from '@dxos/invariant';
import { type ThemedClassName, useForwardedRef } from '@dxos/react-ui';
import { useProjection } from '@dxos/react-ui-canvas';
import { mx } from '@dxos/react-ui-theme';

import { Anchor, createAnchors, defaultAnchors, defaultAnchorSize } from './Anchor';
import { type ShapeComponentProps, shapeAttrs } from './Shape';
import { type DragDropPayload, useEditorContext } from '../../hooks';
import { getBoundsProperties } from '../../layout';
import { type Polygon } from '../../types';
import { type TextBoxProps } from '../TextBox';
import { styles } from '../styles';

// TODO(burdon): Surface for form content. Or pass in children (which may include a Surface).
//  return <Surface ref={forwardRef} role='card' limit={1} data={{ content: object} />;

// NOTE: Delaying double-click detection makes select slow.
const DBLCLICK_TIMEOUT = 0;

export type FrameProps = ShapeComponentProps<Polygon> & {
  Component?: FC<FrameProps>;
  editing?: boolean;
  showAnchors?: boolean;
  onClose?: (value: string) => void;
  onCancel?: () => void;
};

/**
 * Draggable Frame around polygons.
 */
export const Frame = ({ Component, showAnchors, ...baseProps }: FrameProps) => {
  const { shape } = baseProps;
  const { monitor, registry, editing, setEditing } = useEditorContext();
  const { root, projection, styles: projectionStyles } = useProjection();

  const dragging = monitor.state((state) => state.type === 'frame' && state.shape.id === shape.id).value;
  const isDragging = dragging.type === 'frame';
  const isEditing = editing?.shape.id === shape.id;
  const [active, setActive] = useState(false);
  const [preview, setPreview] = useState<HTMLElement>();

  // Dragging.
  const draggingRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    invariant(draggingRef.current);
    return combine(
      dropTargetForElements({
        element: draggingRef.current,
        getData: () => ({ type: 'frame', shape }) satisfies DragDropPayload,
        canDrop: () => monitor.canDrop({ type: 'frame', shape }),
        onDragEnter: () => setActive(true),
        onDragLeave: () => setActive(false),
        onDrop: () => setActive(false),
      }),
      draggable({
        element: draggingRef.current,
        getInitialData: () => ({ type: 'frame', shape }) satisfies DragDropPayload,
        onGenerateDragPreview: ({ nativeSetDragImage }) => {
          setCustomNativeDragPreview({
            // TODO(burdon): Set preview to "snapshot" image then remove.
            render: ({ container }) => {
              setPreview(container);
              return () => setPreview(undefined);
            },
            getOffset: ({ container }) => {
              // NOTE: During preview, we render ghost anchors so that we can predict the actual size of the image.
              return {
                x: (projection.scale * shape.size.width + defaultAnchorSize.width) / 2,
                y: (projection.scale * shape.size.height + defaultAnchorSize.height) / 2,
              };
            },
            nativeSetDragImage,
          });
        },
        onDragStart: () => {
          monitor.start({ type: 'frame', shape });
        },
      }),
    );
  }, [root, projection, monitor, shape]);

  const handleClose: TextBoxProps['onClose'] = (value: string) => {
    shape.text = value;
    setEditing(undefined);
  };

  const handleCancel: TextBoxProps['onCancel'] = () => {
    setEditing(undefined);
  };

  // Custom anchors.
  const anchors = useMemo(
    () => registry.getShapeDef(shape.type)?.getAnchors?.(shape) ?? {},
    [shape.center, shape.size.height],
  );

  return (
    <>
      <FrameContent
        {...baseProps}
        hidden={isDragging}
        active={active}
        anchors={anchors}
        onEdit={() => setEditing({ shape })}
        ref={draggingRef}
      >
        {Component && <Component {...baseProps} editing={isEditing} onClose={handleClose} onCancel={handleCancel} />}
      </FrameContent>

      {/* Drag preview (NOTE: styles should be included to apply scale). */}
      {preview &&
        createPortal(
          <div style={projectionStyles}>
            <FrameContent {...baseProps} anchors={anchors} preview>
              {Component && <Component {...baseProps} />}
            </FrameContent>
          </div>,
          preview,
        )}
    </>
  );
};

export type FrameContentProps = PropsWithChildren<
  ThemedClassName<
    {
      hidden?: boolean;
      preview?: boolean;
      anchors: Record<string, Anchor>;
      active?: boolean;
      onEdit?: () => void;
    } & FrameProps
  >
>;

/**
 * Content rendered by frames and tools.
 */
export const FrameContent = forwardRef<HTMLDivElement, FrameContentProps>(
  (
    { children, classNames, shape, debug, selected, editing, hidden, preview, anchors, active, onSelect, onEdit },
    forwardedRef,
  ) => {
    const ref = useForwardedRef(forwardedRef);
    const clickTimer = useRef<number>();
    const handleClick: MouseEventHandler<HTMLDivElement> = (ev) => {
      if (ev.detail === 1 && !editing) {
        clickTimer.current = window.setTimeout(() => {
          onSelect?.(shape.id, ev.shiftKey);
        }, DBLCLICK_TIMEOUT);
      }
    };

    const handleDoubleClick: MouseEventHandler<HTMLDivElement> = () => {
      clearTimeout(clickTimer.current);
      onEdit?.();
    };

    return (
      <div>
        <div
          ref={ref}
          {...shapeAttrs(shape)}
          style={getBoundsProperties({ ...shape.center, ...shape.size })}
          className={mx(
            classNames,
            styles.frameContainer,
            styles.frameHover,
            styles.frameBorder,
            selected && styles.frameSelected,
            active && styles.frameActive,
            shape.guide && styles.frameGuide,
            hidden && 'opacity-0',
            debug && 'opacity-50',
          )}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          // onMouseEnter={() => setActive(true)}
          // onMouseLeave={(ev) => {
          //   // We need to keep rendering the anchor that is being dragged.
          //   const related = ev.relatedTarget as HTMLElement;
          //   if (related?.getAttribute?.(DATA_SHAPE_ID) !== shape.id) {
          //     setActive(false);
          //   }
          // }}
        >
          {children}
        </div>

        {/* Anchors. */}
        {!hidden && (
          <div>
            {Object.values(anchors).map((anchor) => (
              <Anchor
                key={anchor.id}
                shape={shape}
                anchor={anchor}
                size={defaultAnchorSize}
                // onMouseLeave={() => setActive(false)}
              />
            ))}

            {/* NOTE: During preview, we render ghost anchors so that we can predict the actual size of the image. */}
            {preview &&
              Object.values(createAnchors(shape, defaultAnchors)).map((anchor) => (
                <Anchor key={anchor.id} shape={shape} anchor={anchor} size={defaultAnchorSize} classNames='opacity-0' />
              ))}
          </div>
        )}
      </div>
    );
  },
);
