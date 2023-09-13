//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { DocumentStack } from '@dxos/kai-types';
import { Stack, StackRow } from '@dxos/mosaic';
import { Input } from '@dxos/react-appkit';
import { useConfig } from '@dxos/react-client';

import { CustomActionMenu } from './CustomActionMenu';
import { sectionActions, StackSection } from './sections';
import { useFrameContext } from '../../hooks';

export const StackFrame = () => {
  const config = useConfig();
  const { space, objectId } = useFrameContext();
  const stack = objectId ? space!.db.getObjectById<DocumentStack>(objectId) : undefined;
  if (!space || !stack) {
    return null;
  }

  const handleMoveSection = (id: string, from: number, to: number) => {
    const sections = stack.sections;
    const section = sections.find((section) => section.id === id);
    sections.splice(from, 1);
    sections.splice(to, 0, section!);
  };

  return (
    <div className='flex flex-1 w-full justify-center overflow-y-auto'>
      <div className='flex flex-col flex-1 md:max-w-[800px]'>
        <div className='flex flex-col w-full md:mt-4 pt-2 bg-paper-bg shadow-1'>
          {/* Editable title. */}
          <StackRow>
            <Input
              variant='subdued'
              label='Title'
              labelVisuallyHidden
              placeholder='Title'
              slots={{
                root: {
                  className: 'py-4',
                },
                input: {
                  className: 'border-0 text-2xl text-black',
                  spellCheck: false, // TODO(burdon): Config.
                },
              }}
              value={stack.title ?? ''}
              onChange={(event) => {
                stack.title = event.target.value;
              }}
            />
          </StackRow>

          <Stack<DocumentStack.Section>
            slots={{
              section: {
                className: 'py-4',
              },
            }}
            sections={stack.sections}
            onMoveSection={handleMoveSection}
            StackSection={StackSection}
            ContextMenu={({ section }) => (
              <CustomActionMenu actions={sectionActions(config, section)} stack={stack} section={section} />
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default StackFrame;
