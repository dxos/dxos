//
// Copyright 2024 DXOS.org
//

import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import React, { useEffect, useRef } from 'react';

import { invariant } from '@dxos/invariant';
import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type DragDropPayload, useEditorContext } from '../../hooks';
import { getCenter } from '../../layout';
import { createId } from '../../testing';
import { type ShapeRegistry } from '../Canvas';

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

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    invariant(ref.current);
    return draggable({
      element: ref.current,
      getInitialData: () => {
        const shape = registry.createShape(type, { id: createId(), center: { x: 0, y: 0 } });
        return { type: 'tool', tool: type, shape } satisfies DragDropPayload;
      },
      onGenerateDragPreview: ({ nativeSetDragImage, source }) => {
        const data = source.data as DragDropPayload;
        invariant(data.type === 'tool');
        setCustomNativeDragPreview({
          nativeSetDragImage,
          // TODO(burdon): Adjust for scale (need to get projection).
          getOffset: () => {
            return getCenter(data.shape.size);
          },
          // TODO(burdon): Same preview pattern as frame?
          render: ({ container }) => {
            monitor.start({ container, type: 'tool', shape: data.shape });
          },
        });
      },
    });
  }, [monitor]);

  return (
    <div ref={ref} className='flex'>
      <Icon icon={icon} size={6} />
    </div>
  );
};
