//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';

import { DocumentStack } from '@dxos/kai-types';
import { Stack } from '@dxos/mosaic';
import { observer } from '@dxos/react-client';

import { useFrameContext } from '../../hooks';

export const StackSection: FC<{ section: DocumentStack.Section }> = ({ section }) => {
  return <div>section</div>;
};

export const Sidecar = observer(() => {
  const { space, objectId } = useFrameContext();
  const stack = objectId ? space!.db.getObjectById<DocumentStack>(objectId) : undefined;
  if (!space || !stack) {
    return null;
  }

  return (
    <div className='flex shrink-0 md:w-[400px] overflow-y-auto'>
      <div className='flex flex-col flex-1 bg-zinc-100'>
        <Stack<DocumentStack.Section>
          slots={{
            section: {
              className: 'py-4 bg-zinc-100'
            }
          }}
          sections={stack.sections}
          StackSection={StackSection}
          ContextMenu={({ section }) => <div>O !</div>}
        />
      </div>
    </div>
  );
});

export default Sidecar;
