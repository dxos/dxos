//
// Copyright 2024 DXOS.org
//

import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { useEffect, useRef } from 'react';

import { invariant } from '@dxos/invariant';
import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useEditorContext } from '../../hooks';

export type ShapesProps = ThemedClassName<{}>;

export const Shapes = ({ classNames }: ShapesProps) => {
  return (
    <div className={mx('flex p-1 gap-2', classNames)}>
      <Shape id={'rectangle'} icon={'ph--rectangle--regular'} />
      <Shape id={'circle'} icon={'ph--circle--regular'} />
    </div>
  );
};

type ShapeProps = {
  id: string;
  icon: string;
};

const Shape = ({ id, icon }: ShapeProps) => {
  const { dragging } = useEditorContext();
  const isDragging = dragging;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    invariant(ref.current);
    return draggable({
      element: ref.current,
      getInitialData: () => ({ type: 'tool', id }),
      onDragStart: () => {},
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
