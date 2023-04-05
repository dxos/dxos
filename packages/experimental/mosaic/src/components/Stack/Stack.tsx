//
// Copyright 2022 DXOS.org
//

import { DndContext } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import React, { FC } from 'react';

import { DragEndEvent, mx } from '@dxos/react-components';

import { StackFooter, StackSectionContainer } from './StackSection';
import { StackSectionContext } from './context';

const footerId = '__footer';

export type SectionType = { id: string };

export const DefaultStackSection = <T extends SectionType>({ section }: { section: T }) => <div>{section.id}</div>;

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
  StackSection?: FC<{ section: T }>;
  ContextMenu?: FC<{ section?: T }>;
  onMoveSection?: (id: string, from: number, to: number) => void;
  slots?: StackSlots;
};

export const Stack = <T extends SectionType>({
  sections = [],
  StackSection = DefaultStackSection<T>,
  ContextMenu,
  onMoveSection,
  slots = {}
}: StackProps<T>) => {
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (onMoveSection && active && over && active.id !== over.id) {
      if (over.id === footerId) {
        over.id = sections[sections.length - 1].id;
      }

      const activeIndex = sections.findIndex((section) => section.id === active.id);
      const overIndex = sections.findIndex((section) => section.id === over.id);
      onMoveSection(active.id as string, activeIndex, overIndex);
    }
  };

  return (
    <div className={mx('flex flex-col overflow-x-hidden', slots?.root?.className)}>
      <DndContext modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
        <SortableContext
          strategy={verticalListSortingStrategy}
          items={[
            ...(sections.map((section) => {
              return section.id!;
            }) ?? []),
            footerId
          ]}
        >
          <div>
            {sections.map((section, i) => {
              return (
                <StackSectionContext.Provider key={section.id} value={{ section }}>
                  <StackSectionContainer
                    section={section}
                    ContextMenu={ContextMenu}
                    slots={{
                      root: {
                        className: mx('bg-white', i < sections.length - 1 && 'border-b', slots?.section?.className)
                      }
                    }}
                  >
                    <div className={mx('flex flex-col w-full overflow-x-hidden')}>
                      <StackSection section={section} />
                    </div>
                  </StackSectionContainer>
                </StackSectionContext.Provider>
              );
            })}

            <StackFooter id={footerId} ContextMenu={ContextMenu} />
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};
