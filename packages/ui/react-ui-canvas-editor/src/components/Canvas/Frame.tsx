//
// Copyright 2024 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { disableNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/disable-native-drag-preview';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import React, {
  type FC,
  type MouseEventHandler,
  type PropsWithChildren,
  forwardRef,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { invariant } from '@dxos/invariant';
import { type ThemedClassName, useForwardedRef } from '@dxos/react-ui';
import { useCanvasContext } from '@dxos/react-ui-canvas';
import { mx } from '@dxos/react-ui-theme';

import { type DragDropPayload, useEditorContext } from '../../hooks';
import { getBoundsProperties, getInputPoint, pointSubtract } from '../../layout';
import { type Polygon } from '../../types';
import { type Anchor, createAnchorMap, resizeAnchors } from '../anchors';
import { styles } from '../styles';
import { type TextBoxProps } from '../TextBox';

import { AnchorComponent } from './Anchor';
import { type ShapeComponentProps, shapeAttrs } from './Shape';

// Border around frame for preview snapshot.
const previewBorder = 8;

// NOTE: Delaying double-click detection makes select slow.
const DBLCLICK_TIMEOUT = 0;

// TODO(burdon): Remove since native is broken.
const nativeDrag = false;

export type FrameProps = ShapeComponentProps<Polygon> & {
  Component?: FC<FrameProps>;
  editing?: boolean;
  resizable?: boolean;
  showAnchors?: boolean;
  onClose?: (value: string) => void;
  onCancel?: () => void;
};

/**
 * Draggable Frame around polygons.
 */
export const Frame = ({ Component, showAnchors, ...baseProps }: FrameProps) => {
  const { shape } = baseProps;
  const { dragMonitor, layout, editing, setEditing } = useEditorContext();
  const { root, projection, styles: projectionStyles } = useCanvasContext();

  const dragging = dragMonitor.state(
    (state) => (state.type === 'frame' || state.type === 'resize') && state.shape.id === shape.id,
  ).value;
  const isDragging = dragging.type === 'frame';
  const isResizing = dragging.type === 'resize';

  const isEditing = editing?.shape.id === shape.id;
  const [active, setActive] = useState(false);
  const [preview, setPreview] = useState<HTMLElement>();

  // Dragging.
  const draggingRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = draggingRef.current;
    invariant(element);
    return combine(
      dropTargetForElements({
        element,
        getData: () => ({ type: 'frame', shape }) satisfies DragDropPayload,
        canDrop: () => dragMonitor.canDrop({ type: 'frame', shape }),
        onDragEnter: () => setActive(true),
        onDragLeave: () => setActive(false),
        onDrop: () => setActive(false),
      }),
      draggable({
        element,
        getInitialData: () => ({ type: 'frame', shape }) satisfies DragDropPayload,
        onGenerateDragPreview: ({ nativeSetDragImage, location }) => {
          if (!nativeDrag) {
            disableNativeDragPreview({ nativeSetDragImage });
            return;
          }

          setCustomNativeDragPreview({
            /**
             * Calculate relative offset and apply to center position.
             * NOTE: During preview, we render a hidden border to contain the anchors for the native preview snapshot.
             */
            getOffset: () => {
              const pos = getInputPoint(root, location.current.input);

              // Set offset (in model coordinates) relative to center.
              const [p] = projection.toModel([pos]);
              dragMonitor.setOffset(pointSubtract(shape.center, p));

              // Calculate offset relative to top-left corner.
              const [topLeft] = projection.toScreen([
                pointSubtract(shape.center, {
                  x: shape.size.width / 2 + previewBorder,
                  y: shape.size.height / 2 + previewBorder,
                }),
              ]);
              return pointSubtract(pos, topLeft);
            },
            render: ({ container }) => {
              setPreview(container);
              return () => {
                setPreview(undefined);
              };
            },
            nativeSetDragImage,
          });
        },
        onDragStart: ({ location }) => {
          if (!nativeDrag) {
            // Set offset (in model coordinates) relative to center.
            const pos = getInputPoint(root, location.current.input);
            const [p] = projection.toModel([pos]);
            dragMonitor.setOffset(pointSubtract(shape.center, p));
          }

          dragMonitor.start({ type: 'frame', shape });
        },
      }),
    );
  }, [root, projection, projectionStyles, dragMonitor, shape]);

  const handleClose: TextBoxProps['onEnter'] = (value: string) => {
    shape.text = value;
    setEditing(undefined);
  };

  const handleCancel: TextBoxProps['onCancel'] = () => {
    setEditing(undefined);
  };

  // Custom anchors.
  const anchors = layout.getAnchors(shape);

  return (
    <>
      <FrameContent
        {...baseProps}
        ref={draggingRef}
        shape={(isDragging || isResizing) && !nativeDrag ? dragging.shape : shape}
        dragging={isDragging && nativeDrag}
        resizing={isResizing}
        active={active}
        anchors={anchors}
        onEdit={() => setEditing({ shape })}
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
      anchors: Record<string, Anchor>;
      dragging?: boolean;
      resizing?: boolean;
      preview?: boolean;
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
    {
      children,
      classNames,
      shape,
      debug,
      selected,
      editing,
      anchors,
      dragging,
      resizable,
      resizing,
      preview,
      active,
      onSelect,
      onEdit,
    },
    forwardedRef,
  ) => {
    const ref = useForwardedRef(forwardedRef);
    const [resize, setResize] = useState(false);
    useEffect(() => {
      if (!selected) {
        setResize(false);
      }
    }, [selected]);

    const clickTimer = useRef<number>(undefined);
    const handleClick: MouseEventHandler<HTMLDivElement> = (ev) => {
      if (ev.detail === 1 && !editing) {
        clickTimer.current = window.setTimeout(() => {
          onSelect?.(shape.id, { toggle: true, shift: ev.shiftKey });
          setResize(false);
        }, DBLCLICK_TIMEOUT);
      }
    };

    const handleDoubleClick: MouseEventHandler<HTMLDivElement> = () => {
      clearTimeout(clickTimer.current);
      onSelect?.(shape.id);
      setResize(true);
    };

    return (
      <div className='absolute' style={{ left: shape.center.x, top: shape.center.y }}>
        {/*
         * Background.
         * NOTE: We create an expanded background to ensure that the preview contains the anchors for the native image snapshot.
         */}
        {(preview || debug) && (
          <div
            className={mx('absolute', debug && 'border border-dashed border-primary-500')}
            style={getBoundsProperties({
              x: 0,
              y: 0,
              width: shape.size.width + previewBorder * 2,
              height: shape.size.height + previewBorder * 2,
            })}
          />
        )}

        {/* Main body. */}
        <div
          ref={ref}
          {...shapeAttrs(shape)}
          style={getBoundsProperties({ x: 0, y: 0, ...shape.size })}
          className={mx(
            'absolute',
            classNames,
            styles.frameContainer,
            styles.frameBorder,
            !resize && styles.frameHover,
            dragging && 'opacity-0',
            preview && styles.framePreview,
            selected && [styles.frameSelected, styles.top],
            active && styles.frameActive,
            shape.guide && styles.frameGuide,
            shape.classNames,
            debug && 'opacity-30',
          )}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
        >
          {children}
        </div>

        {/* Anchors. */}
        {!dragging && !resizing && (
          <div>
            {Object.values(anchors).map((anchor) => (
              <AnchorComponent
                key={anchor.id}
                classNames={selected && styles.top}
                type='anchor'
                shape={shape}
                anchor={anchor}
              />
            ))}
          </div>
        )}

        {/* Resize handles. */}
        {resizable && (resize || resizing) && (
          <div>
            <div
              style={getBoundsProperties({ x: 0, y: 0, ...shape.size })}
              className={mx('absolute pointer-events-none', selected && styles.top, styles.resizeBorder)}
            />
            {Object.values(createAnchorMap(shape, resizeAnchors)).map((anchor) => (
              <AnchorComponent
                key={anchor.id}
                classNames={selected && styles.top}
                type='resize'
                shape={shape}
                anchor={anchor}
              />
            ))}
          </div>
        )}
      </div>
    );
  },
);
