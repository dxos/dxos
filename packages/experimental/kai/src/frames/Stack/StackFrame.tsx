//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { useQuery, withReactor } from '@dxos/react-client';
import { Input } from '@dxos/react-components';
import { Composer } from '@dxos/react-composer';

import { createPath, useAppRouter } from '../../hooks';
import { Document, DocumentStack } from '../../proto';
import { StackRow } from './StackRow';

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
          documents.forEach((document) => stack.sections.push({ objectId: document.id }));
        }

        navigate(createPath({ spaceKey: space.key, frame: frame.module.id, objectId: stack.id }));
      });
    }
  }, [space, frame, stacks, stack]);

  // TODO(burdon): Spellcheck false in dev mode.
  const spellCheck = false;

  // TODO(burdon): Task/Image sections.

  // TODO(burdon): Drag (mosaic).
  const handleInsertSection = (index: number) => {
    if (stack) {
      stack.sections.splice(index === -1 ? stack.documents.length : index, 0, { document: new Document() });
    }
  };

  const handleDeleteSection = (index: number) => {
    if (stack) {
      stack.sections.splice(index, 1);
    }
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
          {stack.sections.map(({ objectId }, i) => {
            const document = space?.db.getObjectById(objectId!) as Document;

            return (
              <StackRow
                key={document!.id}
                className='border-b'
                showMenu
                onCreate={() => handleInsertSection(i)}
                onDelete={() => handleDeleteSection(i)}
              >
                <Composer
                  document={document!.content}
                  slots={{
                    root: { className: 'grow' },
                    editor: {
                      className: 'kai-composer z-0 text-black text-xl md:text-base',
                      spellCheck
                    }
                  }}
                />
              </StackRow>
            );
          })}

          <StackRow showMenu onCreate={() => handleInsertSection(-1)} />
        </div>
      </div>
    </div>
  );
});

export default StackFrame;
