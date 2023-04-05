//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { DocumentStack } from '@dxos/kai-types';
import { Stack } from '@dxos/mosaic';
import { observer } from '@dxos/react-client';

import { useAppRouter } from '../../hooks';
import { FrameComponent } from '../../registry';
import { ContextMenu } from './defaults';
import { StackSection } from './sections';

export const StackFrame: FrameComponent = observer(() => {
  const { space, objectId } = useAppRouter();
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
    <div className='flex flex-col flex-1 justify-center overflow-y-auto w-full md:max-w-[800px] md:pt-4'>
      <Stack<DocumentStack.Section>
        slots={{ root: { className: 'py-12 bg-paper-bg shadow-1' } }}
        sections={stack.sections}
        onMoveSection={handleMoveSection}
        ContextMenu={({ section }) => <ContextMenu stack={stack} section={section} />}
        StackSection={StackSection}
      />
    </div>
  );
});

export default StackFrame;
