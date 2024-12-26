//
// Copyright 2024 DXOS.org
//

import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { invariant } from '@dxos/invariant';
import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type DragDropPayload, useEditorContext } from '../../hooks';
import { type Polygon } from '../../types';
import { FrameDragPreview, type ShapeRegistry } from '../Canvas';

export type ToolsProps = ThemedClassName<{
  registry: ShapeRegistry;
}>;

export const Tools = ({ classNames, registry }: ToolsProps) => {
  return (
    <div className={mx('flex p-1 gap-2', classNames)}>
      {registry.shapes.map((shape) => (
        <Tool key={shape.type} type={shape.type} icon={shape.icon} />
      ))}
    </div>
  );
};

type ToolProps = {
  type: string;
  icon: string;
};

const Tool = ({ type, icon }: ToolProps) => {
  const { registry, monitor } = useEditorContext();
  // const { styles: projectionStyles } = useProjection();
  const { container, shape } = monitor.state('tool').value;

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    invariant(ref.current);
    return draggable({
      element: ref.current,
      getInitialData: () => ({ type: 'tool', tool: type }) satisfies DragDropPayload,
      onGenerateDragPreview: ({ nativeSetDragImage }) => {
        setCustomNativeDragPreview({
          nativeSetDragImage,
          getOffset: () => {
            // TODO(burdon): Based on type.
            return { x: 64, y: 32 };
          },
          render: ({ container }) => {
            const def = registry.getShape(type);
            if (def) {
              const shape: Polygon = def.create();
              monitor.drag({ container, type: 'tool', shape });
            }
          },
        });
      },
      onDrop: () => monitor.drop(),
    });
  }, []);

  return (
    <>
      <div ref={ref} className={mx('flex', container && 'opacity-50')}>
        <Icon icon={icon} size={6} />
      </div>

      {/* TODO(burdon): Scale. */}
      {container &&
        shape &&
        createPortal(
          <div>
            <FrameDragPreview shape={shape} scale={1} />
          </div>,
          container,
        )}
    </>
  );
};
