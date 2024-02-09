//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework';
import { type Space } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import { topbarBlockPaddingStart } from '@dxos/react-ui-theme';

export const SpaceMain = ({ space }: { space: Space }) => {
  return (
    <Main.Content
      classNames={[topbarBlockPaddingStart, 'min-bs-dvh grid grid-cols-2']}
      data-testid='composer.firstRunMessage'
    >
      <div role='none' className='place-self-stretch'>
        Space panel
      </div>
      <Surface role='keyshortcuts' />
    </Main.Content>
  );
};
