//
// Copyright 2022 DXOS.org
//

import { DotsSixVertical, Plus, Trash } from 'phosphor-react';
import React, { FC, ReactNode, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { useQuery, withReactor } from '@dxos/react-client';
import { Button, DropdownMenu, DropdownMenuItem, getSize, Input, mx } from '@dxos/react-components';
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

  if (!stack) {
    return null;
  }

  return (
    <div className='flex flex-1 overflow-hidden justify-center'>
      <div className='flex flex-col w-full md:max-w-[800px]'>
        <div ref={scrollRef} className='m-0 md:m-4 pb-8 overflow-y-auto bg-paper-bg shadow-1'>
          <Input
            variant='subdued'
            label='Title'
            labelVisuallyHidden
            placeholder='Title'
            slots={{
              root: {
                className: 'px-20 pt-8 bg-paper-bg'
              },
              input: {
                className: 'p-2 border-0 text-2xl text-black',
                spellCheck,
                autoFocus: true
              }
            }}
            value={stack.title ?? ''}
            onChange={(event) => {
              stack.title = event.target.value;
            }}
          />

          {/* TODO(burdon): Hide while typing. */}
          {stack.documents.map((document, i) => (
            <StackRow
              key={document.id}
              className='border-b'
              onCreate={() => handleInsertSection(i)}
              onDelete={() => handleDeleteSection(i)}
            >
              <Composer
                document={document.content}
                slots={{
                  root: { className: 'grow mb-4' },
                  editor: {
                    className: mx('kai-composer', 'z-0 text-black text-xl md:text-base'),
                    spellCheck
                  }
                }}
              />
            </StackRow>
          ))}

          <StackRow onCreate={() => handleInsertSection(-1)} />
        </div>
      </div>
    </div>
  );
});

const StackRow: FC<{ children?: ReactNode; className?: string; onCreate: () => void; onDelete?: () => void }> = ({
  children,
  className,
  onCreate,
  onDelete
}) => {
  return (
    <div className={mx('group flex pr-16 pt-8 pb-4', className)}>
      <div className='flex w-8 -mt-1 ml-6 mr-8 text-gray-400 invisible group-hover:visible'>
        <div>
          <DropdownMenu
            trigger={
              <Button variant='ghost' className='p-1' onClick={onCreate}>
                <Plus className={getSize(4)} />
              </Button>
            }
            slots={{ content: { className: 'z-50' } }}
          >
            <DropdownMenuItem onClick={onCreate}>
              <Plus className={getSize(5)} />
              <span className='mis-2'>Insert section</span>
            </DropdownMenuItem>
            {onDelete && (
              <DropdownMenuItem onClick={onDelete}>
                <Trash className={getSize(5)} />
                <span className='mis-2'>Remove section</span>
              </DropdownMenuItem>
            )}
          </DropdownMenu>
        </div>
        <div className='p-1 cursor-pointer'>
          <DotsSixVertical className={getSize(6)} />
        </div>
      </div>
      {children}
    </div>
  );
};

export default StackFrame;
