//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';

import { DocumentStack, Presentation } from '@dxos/kai-types';
import { Stack } from '@dxos/mosaic';
import { useConfig } from '@dxos/react-client';

import { sectionActions, StackSection } from './sections';
import { CustomActionMenu } from '../Stack';

export const DeckEditor: FC<{ presentation: Presentation }> = ({ presentation }) => {
  const config = useConfig();
  const handleMoveSection = (id: string, from: number, to: number) => {
    const sections = presentation.stack.sections;
    const section = sections.find((section) => section.id === id);
    sections.splice(from, 1);
    sections.splice(to, 0, section!);
  };

  return (
    <div className='flex flex-1 justify-center overflow-y-auto'>
      <div className='flex flex-col flex-1 md:max-w-[800px]'>
        <div className='flex flex-col w-full pt-4 bg-paper-bg shadow-1'>
          <Stack<DocumentStack.Section>
            slots={{ section: { className: 'py-4' } }}
            sections={presentation.stack.sections}
            onMoveSection={handleMoveSection}
            StackSection={StackSection}
            ContextMenu={({ section }) => (
              <CustomActionMenu
                actions={sectionActions(config, section)}
                section={section}
                stack={presentation.stack}
              />
            )}
          />
        </div>
      </div>
    </div>
  );
};
