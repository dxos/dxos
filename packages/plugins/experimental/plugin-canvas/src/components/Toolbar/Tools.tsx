//
// Copyright 2024 DXOS.org
//

import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import React, { useEffect, useRef } from 'react';

import { invariant } from '@dxos/invariant';
import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type DragPayloadData, useEditorContext } from '../../hooks';
import { createEllipse, createRectangle } from '../../layout';
import { type PolygonShape } from '../../types';

export type ToolsProps = ThemedClassName<{}>;

export const Tools = ({ classNames }: ToolsProps) => {
  return (
    <div className={mx('flex p-1 gap-2', classNames)}>
      <Tool id={'rectangle'} icon={'ph--rectangle--regular'} />
      <Tool id={'ellipse'} icon={'ph--circle--regular'} />
      <Tool id={'textbox'} icon={'ph--article--regular'} />
      <Tool id={'form'} icon={'ph--textbox--regular'} />
      <Tool id={'table'} icon={'ph--table--regular'} />
      <Tool id={'function'} icon={'ph--function--regular'} />
      <Tool id={'database'} icon={'ph--database--regular'} />
      <Tool id={'timer'} icon={'ph--alarm--regular'} />
    </div>
  );
};

export type ToolKind = 'rectangle' | 'ellipse' | 'textbox' | 'form' | 'table' | 'function' | 'database' | 'timer';

type ToolProps = {
  id: ToolKind;
  icon: string;
};

const Tool = ({ id, icon }: ToolProps) => {
  const { dragging, setDragging } = useEditorContext();
  const isDragging = dragging;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    invariant(ref.current);
    return draggable({
      element: ref.current,
      getInitialData: () => ({ type: 'tool', tool: id }) satisfies DragPayloadData,
      onGenerateDragPreview: ({ nativeSetDragImage }) => {
        setCustomNativeDragPreview({
          nativeSetDragImage,
          getOffset: () => {
            // TODO(burdon): Based on type.
            return { x: 64, y: 32 };
          },
          render: ({ container }) => {
            // TODO(burdon): Custom shape depending on tool.
            let shape: PolygonShape;
            switch (id) {
              case 'timer':
              case 'function':
              case 'database':
              case 'textbox':
              case 'form':
              case 'table':
              case 'rectangle': {
                shape = createRectangle({
                  id,
                  center: { x: 0, y: 0 },
                  size: { width: 128, height: 64 },
                });
                break;
              }
              case 'ellipse': {
                shape = createEllipse({
                  id,
                  center: { x: 0, y: 0 },
                  size: { width: 128, height: 64 },
                });
                break;
              }
              default:
                return;
            }

            setDragging({ container, shape });
          },
        });
      },
    });
  }, []);

  return (
    <>
      <div ref={ref} className={mx('flex', isDragging && 'opacity-50')}>
        <Icon icon={icon} size={6} />
      </div>
    </>
  );
};
