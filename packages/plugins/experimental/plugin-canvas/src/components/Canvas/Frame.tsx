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

import { Anchor, defaultAnchorSize } from './Anchor';
import { type ShapeComponentProps, shapeAttrs } from './Shape';
import { type DragDropPayload, useEditorContext } from '../../hooks';
import { getBoundsProperties, getInputPoint, pointDivide, pointSubtract } from '../../layout';
import { type Polygon } from '../../types';
import { type TextBoxProps } from '../TextBox';
import { styles } from '../styles';

// Border around frame for preview snapshot.
const previewBorder = defaultAnchorSize.width + 8;

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
// TODO(burdon): Access compute node.
export const Frame = ({ Component, showAnchors, ...baseProps }: FrameProps) => {
  const { shape } = baseProps;
  const { dragMonitor, registry, editing, setEditing } = useEditorContext();
  const { root, projection, styles: projectionStyles } = useProjection();

  const dragging = dragMonitor.state((state) => state.type === 'frame' && state.shape.id === shape.id).value;
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
        canDrop: () => dragMonitor.canDrop({ type: 'frame', shape }),
        onDragEnter: () => setActive(true),
        onDragLeave: () => setActive(false),
        onDrop: () => setActive(false),
      }),
      draggable({
        element: draggingRef.current,
        getInitialData: () => ({ type: 'frame', shape }) satisfies DragDropPayload,
        onGenerateDragPreview: ({ nativeSetDragImage, location }) => {
          setCustomNativeDragPreview({
            /**
             * Calculate relative offset and apply to center position.
             * NOTE: During preview, we render a hidden border to contain the anchors for the native preview snapshot.
             * See preserveOffsetOnSource
             */
            getOffset: () => {
              // TODO(burdon): Seems to move slightly on drop.
              const [center] = projection.toScreen([shape.center]);

              // Set offset to center of shape.
              const pos = getInputPoint(root, location.current.input);
              dragMonitor.setOffset(pointDivide(pointSubtract(center, pos), projection.scale));

              // Calculate offset relative to top-left corner.
              const topLeft = pointSubtract(center, {
                x: (projection.scale * (shape.size.width + previewBorder + 1)) / 2,
                y: (projection.scale * (shape.size.height + previewBorder + 1)) / 2,
              });
              return pointSubtract(pos, topLeft);
            },
            render: ({ container }) => {
              // TODO(burdon): Render directly but set-up new context.
              // https://atlassian.design/components/pragmatic-drag-and-drop/core-package/adapters/element/drag-previews#approach-1-use-a-custom-native-drag-preview
              // const root = createRoot(container);
              // root.render(
              //   <ThemeProvider tx={defaultTx} themeMode='dark'>
              //     <Tooltip.Provider>
              //       <div style={{ transform: `scale(${projection.scale})` }}>
              //         <FrameContent {...baseProps} anchors={anchors} preview>
              //           {Component && <Component {...baseProps} />}
              //         </FrameContent>
              //       </div>
              //     </Tooltip.Provider>
              //   </ThemeProvider>,
              // );
              // return () => root.unmount();

              setPreview(container);
              return () => setPreview(undefined);
            },
            nativeSetDragImage,
          });
        },
        onDragStart: () => {
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
  const anchors = useMemo(
    () => registry.getShapeDef(shape.type)?.getAnchors?.(shape) ?? {},
    [shape.center, shape.size],
  );

  return (
    <>
      <FrameContent
        {...baseProps}
        ref={draggingRef}
        hidden={isDragging}
        active={active}
        anchors={anchors}
        onEdit={() => setEditing({ shape })}
      >
        {/* <pre>{JSON.stringify(shape.center)}</pre> */}
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
      <div ref={ref} {...shapeAttrs(shape)}>
        {/* NOTE: We create an expanded background to ensure that the preview contains the anchors for the native image snapshot. */}
        {(preview || debug) && (
          <div
            style={getBoundsProperties({
              ...shape.center,
              width: shape.size.width + previewBorder,
              height: shape.size.height + previewBorder,
            })}
            className={mx('absolute pointer-events-none', debug && 'border border-dashed border-primary-500')}
          />
        )}

        {/* Main body. */}
        <div
          style={getBoundsProperties({ ...shape.center, ...shape.size })}
          className={mx(
            'overflow-hidden',
            styles.frameContainer,
            styles.frameHover,
            styles.frameBorder,
            classNames,
            preview && styles.framePreview,
            selected && styles.frameSelected,
            active && styles.frameActive,
            shape.guide && styles.frameGuide,
            hidden && 'opacity-0',
            debug && 'opacity-30',
          )}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
        >
          {children}
        </div>

        {/* Anchors. */}
        {!hidden && (
          <div>
            {Object.values(anchors).map((anchor) => (
              <Anchor key={anchor.id} shape={shape} anchor={anchor} size={defaultAnchorSize} />
            ))}
          </div>
        )}

        {/* TODO(burdon): Resize handles (shift key). */}
      </div>
    );
  },
);
