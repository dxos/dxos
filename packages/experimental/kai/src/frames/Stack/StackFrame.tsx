//
// Copyright 2022 DXOS.org
//

import { DndContext } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import React, { FC, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import urlJoin from 'url-join';

import { Document } from '@dxos/echo-schema';
import { EchoSchemaType, Space, useConfig, useQuery, withReactor } from '@dxos/react-client';
import { DragEndEvent, Input, mx, Table as TableComponent } from '@dxos/react-components';
import { Composer } from '@dxos/react-composer';

import { FilePreview } from '../../components';
import { TaskList as TaskListComponent } from '../../containers';
import { createPath, useAppRouter } from '../../hooks';
import { Contact, Document as DocumentType, DocumentStack, File, Table, TaskList } from '../../proto';
import { getColumnType } from '../Table';
import { SortableStackRow, StackRow } from './StackRow';

// TODO(burdon): Factor out menu options and renderers.
// TODO(burdon): Factor out factories.
// TODO(burdon): Factor out Frame components (pure from containers).

export const StackFrame = withReactor(() => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { space, frame, objectId } = useAppRouter();
  const config = useConfig();

  // TODO(burdon): Arrow of documents (part of stack).
  const stacks = useQuery(space, DocumentStack.filter());
  const documents = useQuery(space, DocumentType.filter());

  const stack = objectId ? (space!.db.getObjectById(objectId) as DocumentStack) : undefined;
  useEffect(() => {
    if (space && frame && !stack) {
      setTimeout(async () => {
        let stack = stacks[0];
        if (!stacks.length) {
          stack = await space.db.add(new DocumentStack());
          // TODO(burdon): Cannot add documents directly (recursion bug).
          documents.forEach((document) => stack.sections.push({ objectId: document.id }));
        }

        navigate(createPath({ spaceKey: space.key, frame: frame.module.id, objectId: stack.id }));
      });
    }
  }, [space, frame, stacks, stack]);

  // TODO(burdon): Spellcheck false in dev mode.
  const spellCheck = false;

  // TODO(burdon): Drag (mosaic).
  const handleInsertSection = async (type: EchoSchemaType, objectId: string | undefined, index: number) => {
    if (stack) {
      if (!objectId) {
        switch (type) {
          case DocumentType.type: {
            const object = await space!.db.add(new DocumentType());
            objectId = object.id;
            break;
          }

          case Table.type: {
            const object = await space!.db.add(new Table({ type: Contact.type.name }));
            objectId = object.id;
            break;
          }

          case TaskList.type: {
            const object = await space!.db.add(new TaskList());
            objectId = object.id;
            break;
          }
        }
      }

      if (objectId) {
        stack.sections.splice(index === -1 ? stack.documents.length : index, 0, { objectId });
      }
    }
  };

  const handleDeleteSection = (index: number) => {
    if (stack) {
      stack.sections.splice(index, 1);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (stack && active && over && active.id !== over.id) {
      const activeIndex = stack.sections.findIndex((section) => section.objectId === active.id);
      const activeSection = stack.sections[activeIndex];
      stack.sections.splice(activeIndex, 1);

      const overIndex = stack.sections.findIndex((section) => section.objectId === over.id);
      const delta = activeIndex <= overIndex ? 1 : 0;
      stack.sections.splice(overIndex + delta, 0, activeSection);
    }
  };

  if (!stack) {
    return null;
  }

  return (
    <div ref={scrollRef} className='flex flex-1 justify-center overflow-y-auto'>
      <div className='flex flex-col w-full md:max-w-[800px] md:pt-4 mb-6'>
        <div className='py-12 bg-paper-bg shadow-1'>
          <StackRow>
            <Input
              variant='subdued'
              label='Title'
              labelVisuallyHidden
              placeholder='Title'
              slots={{
                input: {
                  className: 'border-0 text-2xl text-black',
                  autoFocus: true,
                  spellCheck
                }
              }}
              value={stack.title ?? ''}
              onChange={(event) => {
                stack.title = event.target.value;
              }}
            />
          </StackRow>

          {/* TODO(burdon): Hide while typing. */}
          <DndContext modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
            <SortableContext
              strategy={verticalListSortingStrategy}
              items={stack.sections.map((section) => section.objectId!)}
            >
              {stack.sections.map((section, i) => {
                // TODO(burdon): Remove coercion: see __typename access below.
                const object = space!.db.getObjectById(section.objectId!)!;

                return (
                  <SortableStackRow
                    key={object.id}
                    id={object.id}
                    className={mx('py-6', i < stack.sections.length - 1 && 'border-b')}
                    showMenu
                    onCreate={(type, objectId) => handleInsertSection(type, objectId, i)}
                    onDelete={() => handleDeleteSection(i)}
                  >
                    {(object as any).__typename === DocumentType.type.name && (
                      <Composer
                        document={(object as DocumentType).content}
                        slots={{
                          editor: {
                            className: 'kai-composer',
                            spellCheck
                          }
                        }}
                      />
                    )}

                    {(object as any).__typename === Table.type.name && (
                      <div className='flex w-full h-[400px]'>
                        <TableContainer space={space!} table={object as Table} />
                      </div>
                    )}

                    {/* TODO(burdon): Add/delete/sort. */}
                    {/* TODO(burdon): Hide controls if not highlighted. */}
                    {(object as any).__typename === TaskList.type.name && (
                      <TaskListComponent
                        space={space!}
                        tasks={(object as TaskList).tasks}
                        onCreate={(task) => (object as TaskList).tasks.push(task)}
                      />
                    )}

                    {(object as any).__typename === File.type.name && (
                      <div className='flex w-full h-[400px]'>
                        <FilePreview
                          url={urlJoin(config.values.runtime!.services!.ipfs!.gateway!, (object as File).cid)}
                          image
                        />
                      </div>
                    )}
                  </SortableStackRow>
                );
              })}
            </SortableContext>
          </DndContext>

          <StackRow showMenu className='py-6' onCreate={() => handleInsertSection(DocumentType.type, undefined, -1)} />
        </div>
        <div className='pb-4' />
      </div>
    </div>
  );
});

// TODO(burdon): Factor out.
const TableContainer: FC<{ space: Space; table: Table }> = ({ space, table }) => {
  const type = getColumnType(table.type);
  const objects = useQuery(space, type.filter);

  return (
    <TableComponent<Document>
      columns={type.columns.filter((column) => column.Header === 'name' || column.Header === 'email')}
      data={objects}
      slots={{
        header: { className: 'bg-paper-bg' }
      }}
    />
  );
};

export default StackFrame;
