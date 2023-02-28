//
// Copyright 2023 DXOS.org
//
import { StarFour } from 'phosphor-react';
import React, { useContext } from 'react';
import { Outlet } from 'react-router-dom';

import { useSpaces } from '@dxos/react-client';
import {
  Button,
  defaultOsButtonColors,
  ElevationProvider,
  getSize,
  mx,
  ThemeContext,
  Tooltip,
  useButtonShadow,
  useTranslation
} from '@dxos/react-components';
import { PanelSidebarContext, PanelSidebarProvider } from '@dxos/react-ui';

const DocumentTree = () => {
  const _spaces = useSpaces();
  return <span>Tree</span>;
};

const Sidebar = () => {
  const { t } = useTranslation('composer');
  return (
    <ThemeContext.Provider value={{ themeVariant: 'os' }}>
      <ElevationProvider elevation='chrome'>
        <div role='none'>
          <h1 className={mx('shrink-0 font-system-medium text-lg plb-1.5 pli-2')}>{t('current app name')}</h1>
          <DocumentTree />
        </div>
      </ElevationProvider>
    </ThemeContext.Provider>
  );
};

const SidebarToggle = () => {
  const { displayState, setDisplayState } = useContext(PanelSidebarContext);
  const { t } = useTranslation('os');
  const open = displayState === 'show';
  return (
    <ThemeContext.Provider value={{ themeVariant: 'os' }}>
      <div
        role='none'
        className={mx(
          'fixed block-end-0 p-2 transition-[inset-inline-start] ease-in-out duration-200',
          open ? 'inline-start-sidebar' : 'inline-start-0'
        )}
      >
        <Tooltip content={t(open ? 'close sidebar label' : 'open sidebar label')} tooltipLabelsTrigger side='right'>
          <Button onClick={() => setDisplayState(open ? 'hide' : 'show')} className='p-0 bs-[40px] is-[40px] shadow-md'>
            <StarFour
              className={mx(
                getSize(6),
                'transition-transform ease-in-out duration-200',
                open ? 'rotate-45' : 'rotate-0'
              )}
            />
          </Button>
        </Tooltip>
      </div>
    </ThemeContext.Provider>
  );
};

export const DocumentLayout = () => {
  const shadow = useButtonShadow('base');
  return (
    <PanelSidebarProvider
      slots={{
        content: { children: <Sidebar />, className: mx(defaultOsButtonColors, shadow, 'backdrop-blur') },
        main: { role: 'main' }
      }}
    >
      <Outlet />
      <SidebarToggle />
    </PanelSidebarProvider>
  );
};
