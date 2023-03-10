//
// Copyright 2022 DXOS.org
//

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Document as DocumentType, DocumentStack } from '@dxos/kai-types';
import { useQuery, observer } from '@dxos/react-client';

import { createPath, useAppRouter } from '../../hooks';
import { Stack } from './Stack';

// TODO(burdon): Configurable menu options and section renderers (like frames).
// TODO(burdon): Factor out new section data factories.
// TODO(burdon): Factor out components: from other frames, editable task list, etc. Pure vs containers.

export const StackFrame = observer(() => {
  const navigate = useNavigate();
  const { space, frame, objectId } = useAppRouter();

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
          documents.forEach((document) => {
            const section = new DocumentStack.Section({ object: document });
            stack.sections.push(section);
          });
        }

        navigate(createPath({ spaceKey: space.key, frame: frame.module.id, objectId: stack.id }));
      });
    }
  }, [space, frame, stacks, stack]);

  if (!space || !stack) {
    return null;
  }

  return (
    <div className='flex flex-1 justify-center overflow-y-auto'>
      <div className='flex flex-col w-full md:max-w-[800px] md:pt-4 mb-6'>
        <Stack slots={{ root: { className: 'py-12 bg-paper-bg shadow-1' } }} space={space} stack={stack} />
        <div className='pb-4' />
      </div>
    </div>
  );
});

export default StackFrame;
