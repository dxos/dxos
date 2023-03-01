//
// Copyright 2022 DXOS.org
//

import { DndContext } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DotsSixVertical, Plus, Trash } from 'phosphor-react';
import React, { FC, ForwardedRef, forwardRef, ReactNode, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useQuery, withReactor } from '@dxos/react-client';
import { Button, DragEndEvent, DropdownMenu, DropdownMenuItem, getSize, Input, mx } from '@dxos/react-components';
import { Composer } from '@dxos/react-composer';

import { createPath, useAppRouter } from '../../hooks';
import { Document, DocumentStack } from '../../proto';

export const StackFrame = withReactor(() => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { space, frame, objectId } = useAppRouter();

  // TODO(burdon): Arrow of documents (part of stack).
  const stacks = useQuery(space, DocumentStack.filter());
  const documents = useQuery(space, Document.filter());

  const stack = objectId ? (space!.db.getObjectById(objectId) as DocumentStack) : undefined;
  useEffect(() => {
    if (space && frame && !stack) {
      setTimeout(async () => {
        let stack = stacks[0];
        if (!stacks.length) {
          stack = await space.db.add(new DocumentStack());
          stack.documents.push(...documents);
        }

        navigate(createPath({ spaceKey: space.key, frame: frame.module.id, objectId: stack.id }));
      });
    }
  }, [space, frame, stacks, stack]);

  // TODO(burdon): Spellcheck false in dev mode.
  const spellCheck = false;

  // TODO(burdon): Drag (mosaic).
  // TODO(burdon): Task/Image sections.

  const handleInsertSection = (index: number) => {
    if (stack) {
      stack.documents.splice(index === -1 ? stack.documents.length : index, 0, new Document());
    }
  };

  const handleDeleteSection = (index: number) => {
    if (stack) {
      stack.documents.splice(index, 1);
    }
  };

  // TODO(burdon): Error if dragging down.
  const [activeId, setActiveId] = useState<string>();
  const handleDragStart = (event: DragEndEvent) => {
    setActiveId(event.active?.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (stack && active && over && active.id !== over.id) {
      const activeIndex = stack.documents.findIndex((document) => document.id === active.id);
      const activeDocument = stack.documents[activeIndex];
      stack.documents.splice(activeIndex, 1);

      const overIndex = stack.documents.findIndex((document) => document.id === over.id);
      const delta = activeIndex <= overIndex ? 1 : 0;
      stack.documents.splice(overIndex + delta, 0, activeDocument);
    }

    setActiveId(undefined);
  };

  if (!stack) {
    return null;
  }

  return (
    <div className='flex flex-1 overflow-hidden justify-center'>
      <div className='flex flex-col w-full md:max-w-[800px]'>
        <div ref={scrollRef} className='m-0 md:m-4 py-12 overflow-y-auto bg-paper-bg shadow-1'>
          <StackRow>
            <Input
              variant='subdued'
              label='Title'
              labelVisuallyHidden
              placeholder='Title'
              slots={{
                root: {
                  className: 'w-full'
                },
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
          <DndContext modifiers={[restrictToVerticalAxis]} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <SortableContext
              strategy={verticalListSortingStrategy}
              items={stack.documents.map((document) => document.id)}
            >
              {stack.documents.map((document, i) => (
                <SortableStackRow
                  key={document.id}
                  id={document.id}
                  className='py-6 border-b'
                  showMenu
                  onCreate={() => handleInsertSection(i)}
                  onDelete={() => handleDeleteSection(i)}
                >
                  <Composer
                    document={document.content}
                    slots={{
                      root: { className: 'grow' },
                      editor: {
                        className: 'kai-composer z-0 text-black text-xl md:text-base',
                        spellCheck
                      }
                    }}
                  />
                </SortableStackRow>
              ))}

              {/* <DragOverlay>{activeId ? <StackRow>{activeId}</StackRow> : null}</DragOverlay> */}
            </SortableContext>
          </DndContext>

          <StackRow showMenu className='py-6' onCreate={() => handleInsertSection(-1)} />
        </div>
      </div>
    </div>
  );
});

type StackRowProps = {
  style?: any;
  dragAttributes?: any;
  children?: ReactNode;
  Handle?: JSX.Element;
  className?: string;
  showMenu?: boolean;
  onCreate?: () => void;
  onDelete?: () => void;
};

const SortableStackRow: FC<StackRowProps & { id: string }> = ({ id, ...rest }) => {
  // https://docs.dndkit.com/presets/sortable/usesortable
  const { attributes, listeners, transform, transition, setNodeRef } = useSortable({ id });
  const t = transform ? Object.assign(transform, { scaleY: 1 }) : undefined;

  const Handle = (
    <div className='p-1 cursor-pointer'>
      <button {...attributes} {...listeners}>
        <DotsSixVertical className={getSize(6)} />
      </button>
    </div>
  );

  return (
    <StackRow ref={setNodeRef} style={{ transform: CSS.Transform.toString(t), transition }} Handle={Handle} {...rest} />
  );
};

const StackRow = forwardRef(
  (
    { children, Handle, style, dragAttributes, showMenu, className, onCreate, onDelete }: StackRowProps,
    ref: ForwardedRef<HTMLDivElement>
  ) => {
    return (
      <div ref={ref} style={style} className={mx('group flex mx-6 md:mx-0', className)}>
        <div className='hidden md:flex w-24 text-gray-400'>
          {showMenu && (
            <div className='flex invisible group-hover:visible ml-6 -mt-0.5'>
              <div>
                <DropdownMenu
                  trigger={
                    <Button variant='ghost' className='p-1' onClick={onCreate}>
                      <Plus className={getSize(4)} />
                    </Button>
                  }
                  slots={{ content: { className: 'z-50' } }}
                >
                  {onCreate && (
                    <DropdownMenuItem onClick={onCreate}>
                      <Plus className={getSize(5)} />
                      <span className='mis-2'>Insert section</span>
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem onClick={onDelete}>
                      <Trash className={getSize(5)} />
                      <span className='mis-2'>Remove section</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenu>
              </div>
              {Handle}
            </div>
          )}
        </div>
        <div className='flex flex-1 mr-2 md:mr-16'>{children}</div>
      </div>
    );
  }
);

export default StackFrame;
