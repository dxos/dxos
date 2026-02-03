//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/react';
import { Main as NaturalMain, Toolbar, useDynamicDrawer, useSidebars, useTranslation } from '@dxos/react-ui';

import { meta } from '../../meta';
import { ContentError } from '../ContentError';
import { ContentLoading } from '../ContentLoading';

const DRAWER_NAME = 'SimpleLayout.Drawer';

/**
 * Side drawer component.
 */
export const Drawer = () => {
  const { t } = useTranslation(meta.id);
  const { drawerState, setDrawerState, closeDrawer } = useSidebars(DRAWER_NAME);
  useDynamicDrawer(DRAWER_NAME);

  const placeholder = useMemo(() => <ContentLoading />, []);

  if (drawerState === 'closed') {
    return null;
  }

  const isFullyExpanded = drawerState === 'full';
  const handleToggleExpand = () => {
    setDrawerState(isFullyExpanded ? 'expanded' : 'full');
  };

  return (
    <NaturalMain.Drawer label={t('drawer label')}>
      <Toolbar.Root>
        <Toolbar.Separator variant='gap' />
        <Toolbar.IconButton
          icon={isFullyExpanded ? 'ph--arrow-down--regular' : 'ph--arrow-up--regular'}
          iconOnly
          label={isFullyExpanded ? t('collapse drawer label') : t('expand drawer label')}
          onClick={handleToggleExpand}
        />
        <Toolbar.IconButton
          icon='ph--x--regular'
          iconOnly
          label={t('close drawer label')}
          onClick={() => closeDrawer()}
        />
      </Toolbar.Root>
      <Surface role='article' limit={1} fallback={ContentError} placeholder={placeholder} />
    </NaturalMain.Drawer>
  );
};

Drawer.displayName = DRAWER_NAME;
