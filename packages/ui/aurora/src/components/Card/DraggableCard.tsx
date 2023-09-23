//
// Copyright 2023 DXOS.org
//

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import React, { FC } from 'react';

import { mx } from '@dxos/aurora-theme';

import { Card } from './Card';
import { TypeCard, TypeCardProps } from './Custom';

/**
 * Card wrapper.
 * https://docs.dndkit.com/api-documentation/draggable/drag-overlay#wrapper-nodes
 */
export const DraggableCard: FC<TypeCardProps> = ({ id, type, classNames, ...props }) => {
  // https://docs.dndkit.com/api-documentation/draggable/usedraggable
  const { attributes, listeners, transform, isDragging, setNodeRef } = useDraggable({ id });
  const style = {
    transform: transform ? CSS.Transform.toString(Object.assign(transform, { scaleX: 1, scaleY: 1 })) : undefined,
  };

  // TODO(burdon): Avoid outer diff and pass node into Card?
  return (
    <div ref={setNodeRef} style={style} className={mx(isDragging && 'z-10 relative ring ring-red-500')}>
      <TypeCard
        id={id}
        type={type}
        classNames={classNames}
        handle={<Card.Handle {...attributes} {...listeners} />}
        menu={<Card.Menu />}
        {...props}
      />
    </div>
  );
};
