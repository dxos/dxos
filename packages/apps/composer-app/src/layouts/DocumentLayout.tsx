//
// Copyright 2023 DXOS.org
//
import { Intersect, Planet, StarFour } from 'phosphor-react';
import React, { useContext } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';

import { PublicKey, ShellLayout, useClient, useSpace, useSpaces } from '@dxos/react-client';
import {
  Button,
  defaultOsButtonColors,
  DensityProvider,
  ElevationProvider,
  getSize,
  mx,
  ThemeContext,
  Tooltip,
  useButtonShadow,
  useTranslation
} from '@dxos/react-components';
import { PanelSidebarContext, PanelSidebarProvider, useShell } from '@dxos/react-ui';

import { getPath } from '../routes';

const DocumentTree = () => {
  const _spaces = useSpaces();
  return <span>Tree</span>;
};

const Sidebar = () => {
  const client = useClient();
  const shell = useShell();
  const navigate = useNavigate();
  const { t } = useTranslation('composer');
  const { spaceKey } = useParams();
  const space = useSpace(spaceKey ? PublicKey.fromHex(spaceKey) : undefined);

  const handleCreateSpace = async () => {
    const space = await client.echo.createSpace();
    navigate(getPath(space));
  };

  const handleJoinSpace = () => {
    void shell.setLayout(ShellLayout.JOIN_SPACE, { spaceKey: space?.key });
  };

  return (
    <ThemeContext.Provider value={{ themeVariant: 'os' }}>
      <ElevationProvider elevation='chrome'>
        <DensityProvider density='fine'>
          <div role='none flex flex-col bs-full'>
            <h1 className={mx('shrink-0 font-system-medium text-lg plb-1.5 pli-2')}>{t('current app name')}</h1>
            <DocumentTree />
            <div role='none' className='shrink-0 flex flex-wrap gap-1 pli-1.5'>
              <Button className='grow gap-1' onClick={handleJoinSpace}>
                <Intersect className={getSize(4)} />
                <span>{t('join space label', { ns: 'appkit' })}</span>
              </Button>
              <Button className='grow gap-1' onClick={handleCreateSpace}>
                <Planet className={getSize(4)} />
                <span>{t('create space label', { ns: 'appkit' })}</span>
              </Button>
            </div>
          </div>
        </DensityProvider>
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
  const { spaceKey } = useParams();
  const space = useSpace(spaceKey ? PublicKey.fromHex(spaceKey) : undefined);
  const shadow = useButtonShadow('base');
  return (
    <PanelSidebarProvider
      slots={{
        content: { children: <Sidebar />, className: mx(defaultOsButtonColors, shadow, 'backdrop-blur') },
        main: { role: 'main' }
      }}
    >
      <Outlet context={{ space }} />
      <SidebarToggle />
    </PanelSidebarProvider>
  );
};
