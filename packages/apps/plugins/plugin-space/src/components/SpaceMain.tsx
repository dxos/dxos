//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework';
import { type Space } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import { topbarBlockPaddingStart } from '@dxos/react-ui-theme';
import { ClipboardProvider, SpacePanel } from '@dxos/shell/react';

export const SpaceMain = ({ space }: { space: Space }) => {
  return (
    <Main.Content
      classNames={[topbarBlockPaddingStart, 'min-bs-dvh grid place-items-center grid-cols-2']}
      data-testid='composer.firstRunMessage'
    >
      <div role='none' className='place-self-stretch grid grid-rows-[min-content_1fr]'>
        <ClipboardProvider>
          <SpacePanel space={space} variant='main' />
        </ClipboardProvider>
      </div>
      <Surface role='keyshortcuts' />
    </Main.Content>
  );
};
