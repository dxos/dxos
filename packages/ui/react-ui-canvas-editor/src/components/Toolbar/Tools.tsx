//
// Copyright 2024 DXOS.org
//

import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import React, { useEffect, useRef } from 'react';

import { invariant } from '@dxos/invariant';
import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type DragDropPayload, useEditorContext } from '../../hooks';
import { getCenter } from '../../layout';
import { createId } from '../../testing';
import { type ShapeRegistry } from '../Canvas';

export type ToolsProps = ThemedClassName<{
  registry: ShapeRegistry;
}>;

// TODO(burdon): Toolbar/menu.
export const Tools = ({ classNames, registry }: ToolsProps) => {
  return (
    <div className={mx('flex flex-wrap gap-2 max-is-[80%] justify-center', classNames)}>
      {registry.defs.map(({ shapes }, i) => (
        <div key={i} className='flex p-1 gap-2 items-center bg-baseSurface rounded-sm border border-separator'>
          {shapes.map((shape) => (
            <Tool key={shape.type} type={shape.type} icon={shape.icon} />
          ))}
        </div>
      ))}
    </div>
  );
};

type ToolProps = {
  type: string;
  icon: string;
};

const Tool = ({ type, icon }: ToolProps) => {
  const { registry, dragMonitor } = useEditorContext();

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    invariant(ref.current);
    return draggable({
      element: ref.current,
      getInitialData: () => {
        // Create shape from registry.
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
            dragMonitor.start({ container, type: 'tool', shape: data.shape });
          },
        });
      },
    });
  }, [dragMonitor]);

  // TODO(burdon): Tooltip.
  return (
    <div ref={ref} className='flex' title={type}>
      <Icon icon={icon} size={6} />
    </div>
  );
};
