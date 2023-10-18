//
// Copyright 2022 DXOS.org
//

import { DndContext, MouseSensor, useSensor, type DragEndEvent } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import React, { type FC, useEffect, useRef } from 'react';

import { mx } from '@dxos/aurora-theme';

import { StackFooter, DraggableStackRow } from './StackSection';
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
  selected?: string;
  onSelect?: (section?: T) => void;
  StackSection?: FC<{ section: T; onSelect?: () => void }>;
  ContextMenu?: FC<{ section?: T }>;
  ActionButton?: FC<{ section?: T }>;
  onMoveSection?: (id: string, from: number, to: number) => void;
  showFooter?: boolean;
  slots?: StackSlots;
};

export const Stack = <T extends SectionType>({
  sections = [],
  selected,
  onSelect,
  StackSection = DefaultStackSection<T>,
  ContextMenu,
  ActionButton,
  onMoveSection,
  showFooter = true,
  slots = {},
}: StackProps<T>) => {
  const selectedRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selected) {
      selectedRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selected]);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 8, // Move 10px before activating.
    },
  });

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
      <DndContext modifiers={[restrictToVerticalAxis]} sensors={[mouseSensor]} onDragEnd={handleDragEnd}>
        <SortableContext
          strategy={verticalListSortingStrategy}
          items={[
            ...(sections.map((section) => {
              return section.id!;
            }) ?? []),
            footerId,
          ]}
        >
          <div>
            {sections.map((section, i) => {
              return (
                <StackSectionContext.Provider key={section.id} value={{ section }}>
                  <div ref={section.id === selected ? selectedRef : undefined}>
                    <DraggableStackRow
                      section={section}
                      ContextMenu={ContextMenu}
                      ActionButton={ActionButton}
                      slots={{
                        root: {
                          className: mx('bg-white', i < sections.length - 1 && 'border-b', slots?.section?.className),
                        },
                      }}
                    >
                      <div className={mx('flex flex-col w-full overflow-x-hidden')}>
                        <StackSection section={section} onSelect={() => onSelect?.(section)} />
                      </div>
                    </DraggableStackRow>
                  </div>
                </StackSectionContext.Provider>
              );
            })}

            {showFooter && <StackFooter id={footerId} ContextMenu={ContextMenu} slots={{ root: slots?.section }} />}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};
