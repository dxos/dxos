//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';

import { DocumentStack, Presentation } from '@dxos/kai-types';
import { Stack } from '@dxos/mosaic';
import { observer } from '@dxos/react-client';

import { CustomActionMenu } from '../Stack';
import { sectionActions, StackSection } from './sections';

export const DeckEditor: FC<{ presentation: Presentation }> = observer(({ presentation }) => {
  const handleMoveSection = (id: string, from: number, to: number) => {
    const sections = presentation.stack.sections;
    const section = sections.find((section) => section.id === id);
    sections.splice(from, 1);
    sections.splice(to, 0, section!);
  };

  return (
    <div className='flex flex-1 justify-center overflow-y-auto'>
      <div className='flex flex-col flex-1 w-full md:max-w-[800px] md:py-4'>
        <Stack<DocumentStack.Section>
          slots={{ root: { className: 'py-12 bg-paper-bg shadow-1' }, section: { className: 'py-2' } }}
          sections={presentation.stack.sections}
          onMoveSection={handleMoveSection}
          StackSection={StackSection}
          ContextMenu={({ section }) => (
            <CustomActionMenu actions={sectionActions(section)} section={section} stack={presentation.stack} />
          )}
        />
      </div>
    </div>
  );
});
