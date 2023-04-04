//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';

import { DocumentStack, Presentation } from '@dxos/kai-types';
import { Stack, Item } from '@dxos/mosaic';
import { Space, useIdentity } from '@dxos/react-client';
import { Composer } from '@dxos/react-composer';

import { useAppRouter } from '../../hooks';

export const DeckEditor: FC<{ space: Space; presentation: Presentation }> = ({ space, presentation }) => (
  <div className='flex flex-1 justify-center overflow-y-auto'>
    <div className='flex flex-col w-full md:max-w-[800px] md:pt-4 mb-6'>
      <Stack<Item<DocumentStack.Section>>
        slots={{ root: { className: 'py-12 bg-paper-bg shadow-1' } }}
        sections={presentation.stack.sections}
        StackSection={StackSection}
      />
      <div className='pb-4' />
    </div>
  </div>
);

// TODO(burdon): Item.
const StackSection: FC<{ section: Item<DocumentStack.Section> }> = ({ section }) => {
  const identity = useIdentity();
  const { space } = useAppRouter();
  const object = section.object;

  return (
    <Composer
      identity={identity}
      space={space}
      text={object.content}
      slots={{
        editor: {
          spellCheck: false // TODO(burdon): Config.
        }
      }}
    />
  );
};
