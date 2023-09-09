//
// Copyright 2023 DXOS.org
//

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { DotsSixVertical, DotsThreeVertical } from '@phosphor-icons/react';
import React, { FC } from 'react';

import { getSize, inputSurface, mx } from '@dxos/aurora-theme';

// TODO(burdon): Universal search.
// TODO(burdon): Cards are used across search, kanban, threads, notes, etc.

// Cards (grid/mosaic)
// - Chat message
// - Kanban/Note
// - Search result

// Layout
// - Square/rectangular.
// - Icon
// - Title
// - Body/sections
// - Menu
// - Expand

// Containers
// - CardStack (column)
// - CardGrid/Carousel
// - Masonry

export type CardProps = {
  id: string;
  title: string;
  sections?: {
    text?: string;
  }[];
};

export const Card: FC<CardProps> = ({ id, title, sections }) => {
  return (
    <div
      key={id}
      className={mx(
        'flex px-2 py-2 gap-2',
        'min-w-[280px] max-w-[360px] max-h-[300px]',
        'shadow-sm rounded',
        inputSurface,
      )}
    >
      {/* TODO(burdon): Endcap. */}
      <div className='flex shrink-0 h-6 items-center'>
        <DotsSixVertical className={mx(getSize(5), 'cursor-pointer')} />
      </div>
      <div className='flex flex-col grow gap-1 overflow-hidden'>
        <div className='flex h-6 items-center truncate'>{title}</div>
        {sections?.map((section, i) => (
          <div key={i} className='text-sm font-thin'>
            {section?.text}
          </div>
        ))}
      </div>
      <div className='flex shrink-0 h-6 items-center'>
        <DotsThreeVertical className={mx(getSize(5), 'cursor-pointer')} />
      </div>
    </div>
  );
};

export const DraggableCard: FC<CardProps> = ({ id, ...props }) => {
  const { attributes, listeners, transform, isDragging, setNodeRef } = useDraggable({ id });
  const style = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
  };

  console.log(style);

  // TODO(burdon): Drag handle.
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={mx(isDragging && 'z-[100] ring')} // TODO(burdon): Z?
    >
      <Card id={id} {...props} />
    </div>
  );
};
