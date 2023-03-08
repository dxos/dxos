//
// Copyright 2022 DXOS.org
//

import { DndContext } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import React from 'react';

import { Contact, Document as DocumentType, DocumentStack, Table, TaskList } from '@dxos/kai-types';
import { Document, EchoSchemaType, useConfig, observer, Space } from '@dxos/react-client';
import { DragEndEvent, Input, mx } from '@dxos/react-components';

import { StackContent } from './StackContent';
import { SortableStackRow, StackRow } from './StackRow';

// TODO(burdon): Configurable menu options and section renderers (like frames).
// TODO(burdon): Factor out new section data factories.
// TODO(burdon): Factor out components: from other frames, editable task list, etc. Pure vs containers.

export type StackSlots = {
  root?: {
    className?: string;
  };
};

export type StackProps = {
  slots?: StackSlots;
  space: Space;
  stack: DocumentStack;
  showTitle?: boolean;
};

export const Stack = observer(({ slots = {}, space, stack, showTitle = true }: StackProps) => {
  const config = useConfig();

  // TODO(burdon): Drag (mosaic).
  const handleInsertSection = async (type: EchoSchemaType, objectId: string | undefined, index: number) => {
    console.log('!!!!!!!!!!!!!', type.name);

    let object: Document;
    if (objectId) {
      object = space!.db.getObjectById(objectId)!;
    } else {
      switch (type) {
        case DocumentType.type: {
          object = await space!.db.add(new DocumentType());
          break;
        }

        case Table.type: {
          object = await space!.db.add(new Table({ type: Contact.type.name }));
          break;
        }

        case TaskList.type: {
          object = await space!.db.add(new TaskList());
          break;
        }
        default: {
          object = await space!.db.add(new DocumentType());
          break;
        }
      }
    }

    const section = new DocumentStack.Section({ object });
    stack.sections.splice(index === -1 ? stack.sections.length : index, 0, section);
  };

  const handleDeleteSection = (index: number) => {
    if (stack) {
      stack.sections.splice(index, 1);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (stack && active && over && active.id !== over.id) {
      const activeIndex = stack.sections.findIndex((section) => section.id === active.id);
      const activeSection = stack.sections[activeIndex];
      stack.sections.splice(activeIndex, 1);

      const overIndex = stack.sections.findIndex((section) => section.id === over.id);
      const delta = activeIndex <= overIndex ? 1 : 0;
      stack.sections.splice(overIndex + delta, 0, activeSection);
    }
  };

  // TODO(burdon): Spellcheck false in dev mode.
  const spellCheck = false;

  return (
    <div className={slots.root?.className}>
      {showTitle && (
        <StackRow>
          <Input
            variant='subdued'
            label='Title'
            labelVisuallyHidden
            placeholder='Title'
            slots={{
              input: {
                className: 'border-0 text-2xl text-black',
                spellCheck
              }
            }}
            value={stack.title ?? ''}
            onChange={(event) => {
              stack.title = event.target.value;
            }}
          />
        </StackRow>
      )}

      {/* TODO(burdon): Hide while typing. */}
      <DndContext modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
        <SortableContext
          strategy={verticalListSortingStrategy}
          items={stack.sections.map((section) => {
            return section.id!;
          })}
        >
          {stack.sections.map((section, i) => {
            return (
              <SortableStackRow
                key={section.id}
                id={section.id}
                className={mx('py-6', i < stack.sections.length - 1 && 'border-b')}
                showMenu
                onCreate={(type, objectId) => handleInsertSection(type, objectId, i)}
                onDelete={() => handleDeleteSection(i)}
              >
                <StackContent config={config} space={space!} section={section} spellCheck={spellCheck} />
              </SortableStackRow>
            );
          })}
        </SortableContext>
      </DndContext>

      <StackRow showMenu className='py-6' onCreate={() => handleInsertSection(DocumentType.type, undefined, -1)} />
    </div>
  );
});
