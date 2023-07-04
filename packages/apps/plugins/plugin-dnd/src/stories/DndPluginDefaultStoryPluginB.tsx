//
// Copyright 2023 DXOS.org
//

import { useDroppable } from '@dnd-kit/core';
import React from 'react';

import { mx } from '@dxos/aurora-theme';

const DndPluginDefaultStoryPluginBDefault = () => {
  const { setNodeRef, isOver } = useDroppable({ id: 'dndStoryPluginB' });
  return (
    <div
      className={mx(
        'p-2 min-is-[300px] rounded-xl border-dashed border border-neutral-500/50',
        isOver && 'bg-neutral-500/20',
      )}
      ref={setNodeRef}
    ></div>
  );
};

export const DndPluginDefaultStoryPluginB = () => {
  return {
    meta: {
      id: 'dxos:dndStoryPluginB',
    },
    provides: {
      component: (datum: unknown, role?: string) => {
        if (role === 'dndpluginstory') {
          return DndPluginDefaultStoryPluginBDefault;
        } else {
          return null;
        }
      },
    },
  };
};
