//
// Copyright 2022 DXOS.org
//

import { DndContext } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import React, { FC, ReactNode } from 'react';

import { DragEndEvent, mx } from '@dxos/react-components';

import { SortableStackRow, StackRow } from './StackRow';

// TODO(burdon): Configurable menu options and section renderers (like frames).
// TODO(burdon): Factor out new section data factories.
// TODO(burdon): Factor out components: from other frames, editable task list, etc. Pure vs containers.

export type SectionType = { id: string };

export type StackSlots = {
  root?: {
    className?: string;
  };
  section?: {
    className?: string;
  };
};

export type StackProps<T extends SectionType> = {
  sections?: T[];
  StackSection: FC<{ section: T }>;
  ContextMenu?: ReactNode;
  onMoveSection?: (id: string, from: number, to: number) => void;
  slots?: StackSlots;
};

export const Stack = <T extends SectionType>({
  sections = [],
  StackSection,
  ContextMenu,
  onMoveSection,
  slots = {}
}: StackProps<T>) => {
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (onMoveSection && active && over && active.id !== over.id) {
      const activeIndex = sections.findIndex((section) => section.id === active.id);
      const overIndex = sections.findIndex((section) => section.id === over.id);
      onMoveSection(active.id as string, activeIndex, overIndex);
    }
  };

  // TODO(burdon): Scrolling bug to bottom.
  return (
    <div className={mx('flex flex-col flex-1 overflow-x-hidden', slots?.root?.className)}>
      <DndContext modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
        <SortableContext
          strategy={verticalListSortingStrategy}
          items={
            sections.map((section) => {
              return section.id!;
            }) ?? []
          }
        >
          <div>
            {sections.map((section, i) => {
              return (
                <SortableStackRow
                  key={section.id}
                  id={section.id}
                  slots={{
                    root: {
                      className: mx('bg-white', i < sections.length - 1 && 'border-b', slots?.section?.className)
                    }
                  }}
                  ContextMenu={ContextMenu}
                >
                  <div className={mx('flex w-full overflow-x-hidden')}>
                    <StackSection section={section} />
                  </div>
                </SortableStackRow>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      <StackRow />
    </div>
  );
};
