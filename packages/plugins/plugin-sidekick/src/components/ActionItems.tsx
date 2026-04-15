//
// Copyright 2025 DXOS.org
//

import React from 'react';

export type ActionItem = {
  id: string;
  text: string;
  completed: boolean;
};

export type ActionItemsProps = {
  items: ActionItem[];
  onToggle?: (item: ActionItem) => void;
  classNames?: string;
};

export const ActionItems = ({ items, onToggle, classNames }: ActionItemsProps) => {
  if (items.length === 0) {
    return (
      <div className={classNames}>
        <p className='text-sm text-description italic'>No action items.</p>
      </div>
    );
  }

  return (
    <div className={classNames}>
      <ul className='space-y-1'>
        {items.map((item) => (
          <li key={item.id} className='flex items-center gap-2 text-sm'>
            <input
              type='checkbox'
              checked={item.completed}
              onChange={() => onToggle?.(item)}
              className='shrink-0'
            />
            <span className={item.completed ? 'line-through text-description' : ''}>{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
