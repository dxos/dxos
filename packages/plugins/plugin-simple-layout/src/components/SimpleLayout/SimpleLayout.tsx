//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { log } from '@dxos/log';
import { useTranslation } from '@dxos/react-ui';
import { Mosaic } from '@dxos/react-ui-mosaic';

import { useSimpleLayoutState } from '../../hooks';
import { meta } from '../../meta';
import { Dialog } from '../Dialog';
import { PopoverContent, PopoverRoot } from '../Popover';

import { Drawer } from './Drawer';
import { Main } from './Main';
import { MobileLayout } from './MobileLayout';

// TODO(burdon): Mobile/Desktop variance?
export const SimpleLayout = () => {
  const { t } = useTranslation(meta.id);
  const { state } = useSimpleLayoutState();
  log.info('SimpleLayout', { state });

  return (
    <Mosaic.Root classNames='contents'>
      <MobileLayout.Root drawerState={state.drawerState}>
        <PopoverRoot>
          <MobileLayout.Main>
            <Main />
          </MobileLayout.Main>
          <MobileLayout.Drawer label={t('drawer label')}>
            <Drawer />
          </MobileLayout.Drawer>
          <Dialog />
          <PopoverContent />
        </PopoverRoot>
      </MobileLayout.Root>
    </Mosaic.Root>
  );
};
