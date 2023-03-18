//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { DocumentStack } from '@dxos/kai-types';
import { observer } from '@dxos/react-client';

import { useAppRouter } from '../../hooks';
import { FrameComponent } from '../../registry';
import { Stack } from './Stack';

export const StackFrame: FrameComponent = observer(() => {
  const { space, objectId } = useAppRouter();
  const stack = objectId ? space!.db.getObjectById<DocumentStack>(objectId) : undefined;
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
